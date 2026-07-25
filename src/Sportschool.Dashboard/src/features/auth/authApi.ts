import { apiRequest } from "../../shared/api/apiClient";
import { ApiError } from "../../shared/api/apiError";
import { endpoints } from "../../shared/constants/endpoints";
import type { AuthSession } from "../../shared/types/session";

export type LoginInput = {
  email: string;
  password: string;
};

export function login(input: LoginInput): Promise<AuthSession> {
  return loginWithMode(input, "PlatformOwner").catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      return loginWithMode(input, "SchoolAdmin");
    }

    throw error;
  });
}

function loginWithMode(input: LoginInput, mode: "PlatformOwner" | "SchoolAdmin"): Promise<AuthSession> {
  return apiRequest<AuthSession>(endpoints.login, {
    method: "POST",
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      mode,
      deviceName: "dashboard"
    }
  });
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest<void>(endpoints.logout, {
    method: "POST",
    auth: false,
    body: { refreshToken }
  });
}
