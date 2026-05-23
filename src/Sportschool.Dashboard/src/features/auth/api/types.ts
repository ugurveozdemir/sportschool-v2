import type { LoginMode } from "../../../shared/constants/roles";

export type BootstrapPlatformOwnerRequest = {
  email: string;
  fullName: string;
  password: string;
};

export type BootstrapPlatformOwnerResponse = {
  id: string;
  email: string;
  fullName: string;
};

export type LoginRequest = {
  schoolCode?: string | null;
  email: string;
  password: string;
  mode: LoginMode;
  deviceName?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
  schoolId: string | null;
  email: string;
  fullName: string;
  roles: LoginMode[];
};

export type RefreshRequest = {
  refreshToken: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};
