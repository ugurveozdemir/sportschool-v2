export type UserRole = "PlatformOwner" | "SchoolAdmin" | "Coach" | "Parent" | "Athlete";

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  userId: string;
  schoolId: string | null;
  email: string;
  fullName: string;
  loginRole: UserRole;
  roles: UserRole[];
};
