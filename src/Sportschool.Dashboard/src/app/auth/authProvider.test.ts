// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authProvider } from "./authProvider";
import { clearSession, getSession, setSession, type AuthSession } from "./sessionStore";

const schoolAdminSession: AuthSession = {
  accessToken: "access-token",
  accessTokenExpiresAt: "2030-01-01T00:00:00Z",
  userId: "user-id",
  schoolId: "school-id",
  email: "admin@example.com",
  fullName: "School Admin",
  loginRole: "SchoolAdmin",
  roles: ["SchoolAdmin", "Coach"]
};

describe("authProvider", () => {
  beforeEach(() => clearSession());

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tries the school admin login after the platform owner login is rejected", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse(schoolAdminSession));
    vi.stubGlobal("fetch", fetchMock);

    const result = await authProvider.login({ email: "admin@example.com", password: "password" });

    expect(result).toMatchObject({ success: true, redirectTo: "/" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestBody(fetchMock, 0)).toMatchObject({ mode: "PlatformOwner" });
    expect(requestBody(fetchMock, 1)).toMatchObject({ mode: "SchoolAdmin" });
    expect(getSession()).toEqual(schoolAdminSession);
    expect(localStorage.getItem("sportschool.dashboard.session")).toBeNull();
  });

  it("does not send a login request when credentials are missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await authProvider.login({ email: "admin@example.com", password: "" });

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the local session even when the logout request fails", async () => {
    setSession(schoolAdminSession);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    const result = await authProvider.logout({});

    expect(result).toMatchObject({ success: true, redirectTo: "/login" });
    expect(getSession()).toBeNull();
  });

  it("clears the local session before the server logout completes", async () => {
    setSession(schoolAdminSession);
    let completeLogout!: (response: Response) => void;
    const serverLogout = new Promise<Response>((resolve) => {
      completeLogout = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(serverLogout));

    const logout = authProvider.logout({});

    expect(getSession()).toBeNull();
    completeLogout(new Response(null, { status: 204 }));
    await expect(logout).resolves.toMatchObject({ success: true, redirectTo: "/login" });
  });

  it("restores the in-memory session from the refresh cookie after a reload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(schoolAdminSession)));

    const result = await authProvider.check({});

    expect(result).toMatchObject({ authenticated: true });
    expect(getSession()).toEqual(schoolAdminSession);
    expect(localStorage.getItem("sportschool.dashboard.session")).toBeNull();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, callIndex: number): Record<string, unknown> {
  const request = fetchMock.mock.calls[callIndex]?.[1] as RequestInit;
  return JSON.parse(request.body as string) as Record<string, unknown>;
}
