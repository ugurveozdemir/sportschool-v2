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

const legacyStorageKey = "sportschool.dashboard.session";
const userRoles: UserRole[] = ["PlatformOwner", "SchoolAdmin", "Coach", "Parent", "Athlete"];
let activeSession: AuthSession | null = null;
let sessionRevision = 0;

export function getSession(): AuthSession | null {
  removeLegacyStoredSession();
  return activeSession;
}

export function getSessionRevision(): number {
  return sessionRevision;
}

export function setSession(session: AuthSession): void {
  if (!isAuthSession(session)) {
    throw new Error("Invalid dashboard session.");
  }

  removeLegacyStoredSession();
  activeSession = session;
  sessionRevision++;
}

export function clearSession(): void {
  removeLegacyStoredSession();
  activeSession = null;
  sessionRevision++;
}

function removeLegacyStoredSession(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(legacyStorageKey);
  }
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
