import type { AuthSession } from "../types/session";
import { endpoints } from "../constants/endpoints";
import { ApiError } from "./apiError";
import { clearStoredSession, getStoredSession, storeSession } from "./sessionStore";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

let pendingRefresh: Promise<AuthSession | null> | null = null;

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  let response = await sendRequest(path, options);

  if (response.status === 401 && options.auth !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await sendRequest(path, options);
    }
  }

  const text = await response.text();
  const body = text ? parseJson(text) : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }
    throw new ApiError(messageFor(response.status), response.status, body);
  }

  return body as TResponse;
}

export async function apiFormRequest<TResponse>(path: string, method: "POST" | "PUT", body: FormData): Promise<TResponse> {
  let response = await sendFormRequest(path, method, body);

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await sendFormRequest(path, method, body);
    }
  }

  const text = await response.text();
  const responseBody = text ? parseJson(text) : null;
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }
    throw new ApiError(messageFor(response.status), response.status, responseBody);
  }

  return responseBody as TResponse;
}

async function sendRequest(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  const session = getStoredSession();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return fetch(path, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
}

function sendFormRequest(path: string, method: "POST" | "PUT", body: FormData): Promise<Response> {
  const headers = new Headers({ Accept: "application/json" });
  const session = getStoredSession();
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return fetch(path, { method, headers, body });
}

function refreshSession(): Promise<AuthSession | null> {
  pendingRefresh ??= performRefresh().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

async function performRefresh(): Promise<AuthSession | null> {
  const current = getStoredSession();
  if (!current?.refreshToken) {
    return null;
  }

  const response = await fetch(endpoints.refresh, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken })
  });

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  const session = (await response.json()) as AuthSession;
  storeSession(session);
  return session;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFor(status: number): string {
  if (status === 401) return "Oturum süresi doldu, lütfen tekrar giriş yapın.";
  if (status === 403) return "Bu işlem için yetkiniz yok.";
  if (status === 404) return "Kayıt bulunamadı.";
  if (status === 409) return "Bu kayıt zaten mevcut.";
  if (status >= 500) return "Sunucu hatası oluştu.";
  return "İstek başarısız oldu.";
}
