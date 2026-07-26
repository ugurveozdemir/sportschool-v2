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

const storageKey = "sportschool.dashboard.session";

export function getStoredSession(): AuthSession | null {
  const value = localStorage.getItem(storageKey);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeSession(session: AuthSession): void {
  localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(storageKey);
}
