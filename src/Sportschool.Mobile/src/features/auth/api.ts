import { apiRequest } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/constants/endpoints";
import type { LoginRequest, LoginResponse, LoginSchoolResponse } from "@/features/auth/types";

export function listLoginSchools() {
  return apiRequest<LoginSchoolResponse[]>(endpoints.loginSchools, { auth: false });
}

export function login(request: LoginRequest) {
  return apiRequest<LoginResponse>(endpoints.login, { method: "POST", body: request, auth: false });
}

export function logout(refreshToken: string) {
  return apiRequest<void>(endpoints.logout, { method: "POST", body: { refreshToken }, auth: false });
}
