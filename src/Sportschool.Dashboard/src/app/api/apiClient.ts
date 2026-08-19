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
  let sessionToken = options.auth === false ? null : getStoredSession()?.accessToken ?? null;
  let response = await sendRequest(path, options);

  if (response.status === 401 && options.auth !== false && (await refreshSession())) {
    sessionToken = getStoredSession()?.accessToken ?? null;
    response = await sendRequest(path, options);
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401) clearSessionIfCurrent(sessionToken);
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
    body,
    credentials: "same-origin"
  });
}

function refreshSession(): Promise<AuthSession | null> {
  const accessToken = getStoredSession()?.accessToken;
  if (!accessToken) return Promise.resolve(null);
  if (pendingRefresh) return pendingRefresh;

  const refreshAttempt = performRefresh(accessToken).finally(() => {
    if (pendingRefresh === refreshAttempt) {
      pendingRefresh = null;
    }
  });
  pendingRefresh = refreshAttempt;
  return pendingRefresh;
}

async function performRefresh(accessToken: string): Promise<AuthSession | null> {
  const response = await fetch("/api/auth/dashboard/refresh", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin"
  });

  if (!response.ok) {
    clearSessionIfCurrent(accessToken);
    return null;
  }

  const refreshed = (await response.json()) as AuthSession;
  if (getStoredSession()?.accessToken !== accessToken) return null;

  storeSession(refreshed);
  return refreshed;
}

function clearSessionIfCurrent(accessToken: string | null): void {
  if (accessToken && getStoredSession()?.accessToken === accessToken) {
    clearStoredSession();
  }
}

export async function revokeDashboardSession(): Promise<void> {
  try {
    await pendingRefresh;
  } catch {
    // Logout still needs to clear the server cookie after a failed refresh request.
  }
  await apiRequest<void>("/api/auth/dashboard/logout", { method: "POST", auth: false });
}

function messageFor(status: number): string {
  if (status === 401) return "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
  if (status === 403) return "Bu işlem için yetkiniz yok.";
  if (status >= 500) return "Sunucu hatası oluştu.";
  return "İstek tamamlanamadı.";
}
