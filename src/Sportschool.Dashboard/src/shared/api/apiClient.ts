import { ApiError } from "./apiError";
import { setLastResponse } from "./lastResponseStore";
import { getStoredSession } from "./sessionStore";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

const defaultBaseUrl = "";

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}) {
  const method = options.method ?? "GET";
  const startedAt = performance.now();
  const headers = new Headers({ Accept: "application/json" });
  const session = getStoredSession();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${defaultBaseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const body = text ? parseJson(text) : null;
  const durationMs = Math.round(performance.now() - startedAt);

  setLastResponse({
    method,
    path,
    status: response.status,
    ok: response.ok,
    durationMs,
    body,
    requestedAt: new Date().toISOString()
  });

  if (!response.ok) {
    throw new ApiError("API isteği başarısız oldu.", response.status, body);
  }

  return body as TResponse;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
