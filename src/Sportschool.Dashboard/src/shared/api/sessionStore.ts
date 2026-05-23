import type { AuthSession } from "../types/session";

const storageKey = "sportschool.dashboard.session";

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  localStorage.setItem(storageKey, JSON.stringify(session));
  window.dispatchEvent(new Event("sportschool-session-change"));
}

export function clearStoredSession() {
  localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event("sportschool-session-change"));
}
