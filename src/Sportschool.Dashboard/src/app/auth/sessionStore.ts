export type UserRole = "PlatformOwner" | "SchoolAdmin" | "Coach" | "Parent" | "Athlete";

export type AuthSession = {
  accessToken: string;
  accessTokenExpiresAt: string;
  userId: string;
  schoolId: string | null;
  email: string;
  fullName: string;
  loginRole: UserRole;
  roles: UserRole[];
};

const storageKey = "sportschool.dashboard.session";
const userRoles: UserRole[] = ["PlatformOwner", "SchoolAdmin", "Coach", "Parent", "Athlete"];

export function getStoredSession(): AuthSession | null {
  const value = localStorage.getItem(storageKey);
  if (!value) return null;

  try {
    const session = JSON.parse(value) as unknown;
    if (isAuthSession(session)) return session;

    localStorage.removeItem(storageKey);
    return null;
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

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Record<string, unknown>;
  const roles = session.roles;
  return typeof session.accessToken === "string" && session.accessToken.length > 0
    && typeof session.accessTokenExpiresAt === "string" && !Number.isNaN(Date.parse(session.accessTokenExpiresAt))
    && typeof session.userId === "string" && session.userId.length > 0
    && (session.schoolId === null || typeof session.schoolId === "string")
    && typeof session.email === "string" && session.email.length > 0
    && typeof session.fullName === "string" && session.fullName.length > 0
    && isUserRole(session.loginRole)
    && Array.isArray(roles)
    && roles.every(isUserRole)
    && roles.includes(session.loginRole);
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.includes(value as UserRole);
}
