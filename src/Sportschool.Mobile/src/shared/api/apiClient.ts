import { Platform } from "react-native";

import { getCurrentSession, replaceCurrentSession } from "@/core/sessionProvider";
import { endpoints } from "@/shared/constants/endpoints";
import { ApiError, NetworkError } from "@/shared/api/apiError";
import type { Session } from "@/shared/types/session";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  timeoutMs?: number;
};

const baseUrl = resolveBaseUrl();
const defaultRequestTimeoutMs = 15_000;
let pendingRefresh: Promise<boolean> | null = null;

export function resolveApiUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await sendRequest<TResponse>(path, options);
  return response;
}

async function sendRequest<TResponse>(path: string, options: RequestOptions): Promise<TResponse> {
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  const session = getCurrentSession();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false && session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? defaultRequestTimeoutMs);
  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal
    });
  } catch {
    if (controller.signal.aborted) {
      throw new NetworkError("İstek zaman aşımına uğradı.", "timeout");
    }

    throw new NetworkError("Sunucuya ulaşılamadı.", "network");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && options.auth !== false && options.retryOnUnauthorized !== false) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return sendRequest<TResponse>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  const text = await response.text();
  const body = text ? parseJson(text) : null;
  if (!response.ok) {
    throw new ApiError("API isteği başarısız oldu.", response.status, body);
  }

  return body as TResponse;
}

function refreshAccessToken() {
  pendingRefresh ??= performRefresh().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

async function performRefresh() {
  const session = getCurrentSession();
  if (!session?.refreshToken) {
    await replaceCurrentSession(null);
    return false;
  }

  try {
    const refreshed = await sendRequest<Session>(endpoints.refresh, {
      method: "POST",
      body: { refreshToken: session.refreshToken },
      auth: false,
      retryOnUnauthorized: false
    });

    if (getCurrentSession()?.refreshToken !== session.refreshToken) {
      return false;
    }

    await replaceCurrentSession(refreshed);
    return true;
  } catch {
    if (getCurrentSession()?.refreshToken === session.refreshToken) {
      await replaceCurrentSession(null);
    }

    return false;
  }
}

function resolveBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configuredUrl) {
    if (!__DEV__) {
      throw new Error("EXPO_PUBLIC_API_BASE_URL is required for production builds.");
    }

    return Platform.OS === "android" ? "http://10.0.2.2:5062" : "http://localhost:5062";
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }

  if (!__DEV__ && parsedUrl.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTPS for production builds.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.");
  }

  return configuredUrl.replace(/\/+$/, "");
}

function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
