import { clearStoredSession, getStoredSession, storeSession, type AuthSession } from "../auth/sessionStore";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

let pendingRefresh: Promise<AuthSession | null> | null = null;

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  let response = await sendRequest(path, options);

  if (response.status === 401 && options.auth !== false && (await refreshSession())) {
    response = await sendRequest(path, options);
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401) clearStoredSession();
    throw new ApiError(response.status, text || messageFor(response.status));
  }

  return text ? (JSON.parse(text) as TResponse) : (undefined as TResponse);
}

function sendRequest(path: string, options: RequestOptions): Promise<Response> {
  const session = getStoredSession();
  const headers = new Headers({ Accept: "application/json" });
  const isFormData = options.body instanceof FormData;
  const body = options.body instanceof FormData
    ? options.body
    : options.body === undefined ? undefined : JSON.stringify(options.body);

  if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (options.auth !== false && session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  return fetch(path, {
    method: options.method ?? "GET",
    headers,
    body
  });
}

function refreshSession(): Promise<AuthSession | null> {
  pendingRefresh ??= performRefresh().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

async function performRefresh(): Promise<AuthSession | null> {
  const session = getStoredSession();
  if (!session?.refreshToken) return null;

  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken })
  });

  if (!response.ok) {
    clearStoredSession();
    return null;
  }

  const refreshed = (await response.json()) as AuthSession;
  storeSession(refreshed);
  return refreshed;
}

function messageFor(status: number): string {
  if (status === 401) return "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
  if (status === 403) return "Bu işlem için yetkiniz yok.";
  if (status >= 500) return "Sunucu hatası oluştu.";
  return "İstek tamamlanamadı.";
}
