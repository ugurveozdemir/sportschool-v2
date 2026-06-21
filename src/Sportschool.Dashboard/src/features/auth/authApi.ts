import { apiRequest } from "../../shared/api/apiClient";
import { endpoints } from "../../shared/constants/endpoints";
import type { AuthSession } from "../../shared/types/session";

export type LoginInput = {
  email: string;
  password: string;
};

export function login(input: LoginInput): Promise<AuthSession> {
  return apiRequest<AuthSession>(endpoints.login, {
    method: "POST",
    auth: false,
    body: {
      email: input.email,
      password: input.password,
      mode: "PlatformOwner",
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
