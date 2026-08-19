// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoredSession, getStoredSession, storeSession, type AuthSession } from "../auth/sessionStore";
import { ApiError, apiRequest } from "./apiClient";

const oldSession = createSession("old-access");
const refreshedSession = createSession("new-access");

describe("apiRequest session refresh", () => {
  beforeEach(() => {
    localStorage.clear();
    storeSession(oldSession);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shares one refresh request across concurrent unauthorized requests", async () => {
    const refreshResponse = deferred<Response>();
    const fetchMock = vi.fn((path: string, init?: RequestInit) => {
      if (path === "/api/auth/dashboard/refresh") return refreshResponse.promise;

      const authorization = new Headers(init?.headers).get("Authorization");
      return Promise.resolve(authorization === "Bearer new-access"
        ? jsonResponse({ ok: true })
        : new Response(null, { status: 401 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstRequest = apiRequest<{ ok: boolean }>("/api/first");
    const secondRequest = apiRequest<{ ok: boolean }>("/api/second");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    refreshResponse.resolve(jsonResponse(refreshedSession));

    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(fetchMock.mock.calls.filter(([path]) => path === "/api/auth/dashboard/refresh")).toHaveLength(1);
    expect(getStoredSession()).toEqual(refreshedSession);
  });

  it("does not restore a session cleared while refresh is in flight", async () => {
    const refreshResponse = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((path: string) => path === "/api/auth/dashboard/refresh"
      ? refreshResponse.promise
      : Promise.resolve(new Response(null, { status: 401 }))));

    const request = apiRequest("/api/protected");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    clearStoredSession();
    refreshResponse.resolve(jsonResponse(refreshedSession));

    await expect(request).rejects.toBeInstanceOf(ApiError);
    expect(getStoredSession()).toBeNull();
  });

  it("does not clear a newer login when an older refresh fails", async () => {
    const refreshResponse = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn((path: string) => path === "/api/auth/dashboard/refresh"
      ? refreshResponse.promise
      : Promise.resolve(new Response(null, { status: 401 }))));
    const request = apiRequest("/api/protected");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    const newerLogin = createSession("latest-access");
    storeSession(newerLogin);
    refreshResponse.resolve(new Response(null, { status: 401 }));

    await expect(request).rejects.toBeInstanceOf(ApiError);
    expect(getStoredSession()).toEqual(newerLogin);
  });
});

function createSession(accessToken: string): AuthSession {
  return {
    accessToken,
    accessTokenExpiresAt: "2030-01-01T00:00:00Z",
    userId: "user-id",
    schoolId: "school-id",
    email: "admin@example.com",
    fullName: "School Admin",
    loginRole: "SchoolAdmin",
    roles: ["SchoolAdmin"]
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
