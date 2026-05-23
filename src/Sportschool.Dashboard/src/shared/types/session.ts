import type { LoginMode } from "../constants/roles";

export type AuthUser = {
  userId: string;
  schoolId: string | null;
  email: string;
  fullName: string;
  roles: LoginMode[];
};

export type AuthSession = AuthUser & {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
};
