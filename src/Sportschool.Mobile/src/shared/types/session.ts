import type { LoginMode } from "@/shared/constants/roles";

export type Session = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
  schoolId: string | null;
  email: string;
  fullName: string;
  loginRole: LoginMode;
  roles: LoginMode[];
};
