import type { AuthProvider } from "@refinedev/core";
import { ApiError, apiRequest, restoreDashboardSession, revokeDashboardSession } from "../api/apiClient";
import { clearSession, getSession, setSession, type AuthSession } from "./sessionStore";

type LoginInput = {
  email?: string;
  password?: string;
};

export const authProvider: AuthProvider = {
  async login(input: LoginInput) {
    if (!input.email || !input.password) {
      return { success: false, error: new Error("E-posta ve şifre zorunludur.") };
    }

    try {
      const session = await loginDashboard(input.email, input.password);
      setSession(session);
      return { success: true, redirectTo: "/" };
    } catch {
      return { success: false, error: new Error("E-posta veya şifre hatalı.") };
    }
  },

  async logout() {
    clearSession();
    try {
      await revokeDashboardSession();
    } catch {
      // Local session is cleared even if the server is unavailable.
    }
    return { success: true, redirectTo: "/login" };
  },

  async check() {
    const session = getSession() ?? await restoreDashboardSession();
    const canUseDashboard = session?.loginRole === "PlatformOwner" || session?.loginRole === "SchoolAdmin";
    return canUseDashboard
      ? { authenticated: true }
      : { authenticated: false, logout: true, redirectTo: "/login" };
  },

  async onError(error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      return { logout: true, redirectTo: "/login", error };
    }
    return {};
  },

  async getIdentity() {
    const session = getSession();
    return session ? { id: session.userId, name: session.fullName, email: session.email } : null;
  },

  async getPermissions() {
    return getSession()?.roles ?? [];
  }
};

async function loginDashboard(email: string, password: string): Promise<AuthSession> {
  try {
    return await loginWithMode(email, password, "PlatformOwner");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return loginWithMode(email, password, "SchoolAdmin");
    throw error;
  }
}

function loginWithMode(email: string, password: string, mode: "PlatformOwner" | "SchoolAdmin"): Promise<AuthSession> {
  return apiRequest<AuthSession>("/api/auth/dashboard/login", {
    method: "POST",
    auth: false,
    body: { email, password, mode }
  });
}
