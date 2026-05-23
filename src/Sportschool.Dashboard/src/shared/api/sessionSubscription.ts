import { getStoredSession } from "./sessionStore";

export function subscribeToSession(listener: () => void) {
  window.addEventListener("sportschool-session-change", listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener("sportschool-session-change", listener);
    window.removeEventListener("storage", listener);
  };
}

export function getSessionSnapshot() {
  return getStoredSession();
}
