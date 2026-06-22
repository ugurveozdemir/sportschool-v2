import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { LoginRequest, LoginResponse } from "@/features/auth/types";

export function login(request: LoginRequest) {
  return apiRequest<LoginResponse>(endpoints.login, { method: "POST", body: request, auth: false });
}

export function logout(refreshToken: string) {
  return apiRequest<void>(endpoints.logout, { method: "POST", body: { refreshToken }, auth: false });
}
