import type { AuthSession } from "../types/session";

const storageKey = "sportschool.dashboard.session";
export const sessionChangeEvent = "sportschool-session-change";

let cachedRawSession: string | null = null;
let cachedSession: AuthSession | null = null;

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    cachedRawSession = null;
    cachedSession = null;
    return null;
  }

  if (raw === cachedRawSession) {
    return cachedSession;
  }

  try {
    cachedRawSession = raw;
    cachedSession = JSON.parse(raw) as AuthSession;
    return cachedSession;
  } catch {
    cachedRawSession = null;
    cachedSession = null;
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  cachedSession = session;
  cachedRawSession = JSON.stringify(session);
  localStorage.setItem(storageKey, cachedRawSession);
  window.dispatchEvent(new Event(sessionChangeEvent));
}

export function clearStoredSession() {
  cachedRawSession = null;
  cachedSession = null;
  localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(sessionChangeEvent));
}
