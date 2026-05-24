import { endpoints } from "../../../shared/constants/endpoints";
import { apiRequest } from "../../../shared/api/apiClient";
import type {
  BootstrapPlatformOwnerRequest,
  BootstrapPlatformOwnerResponse,
  ChangePasswordRequest,
  LoginSchoolResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest
} from "./types";

export function listLoginSchools() {
  return apiRequest<LoginSchoolResponse[]>(endpoints.loginSchools, {
    auth: false
  });
}

export function bootstrapPlatformOwner(request: BootstrapPlatformOwnerRequest) {
  return apiRequest<BootstrapPlatformOwnerResponse>(endpoints.bootstrapPlatformOwner, {
    method: "POST",
    body: request,
    auth: false
  });
}

export function login(request: LoginRequest) {
  return apiRequest<LoginResponse>(endpoints.login, {
    method: "POST",
    body: request,
    auth: false
  });
}

export function refreshSession(request: RefreshRequest) {
  return apiRequest<LoginResponse>(endpoints.refresh, {
    method: "POST",
    body: request,
    auth: false
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>(endpoints.logout, {
    method: "POST",
    body: { refreshToken },
    auth: false
  });
}

export function changePassword(request: ChangePasswordRequest) {
  return apiRequest<void>(endpoints.changePassword, {
    method: "POST",
    body: request
  });
}
