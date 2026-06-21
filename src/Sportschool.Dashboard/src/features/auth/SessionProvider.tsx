import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearStoredSession,
  getStoredSession,
  sessionChangeEvent,
  storeSession
} from "../../shared/api/sessionStore";
import type { AuthSession } from "../../shared/types/session";
import { login as loginRequest, logout as logoutRequest } from "./authApi";
import { SessionContext, type SessionContextValue } from "./sessionContext";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

  useEffect(() => {
    const sync = () => setSession(getStoredSession());
    window.addEventListener(sessionChangeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(sessionChangeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      signIn: async (input) => {
        storeSession(await loginRequest(input));
      },
      signOut: async () => {
        const current = getStoredSession();
        if (current?.refreshToken) {
          try {
            await logoutRequest(current.refreshToken);
          } catch {
            // ignore: clear local session regardless of server response
          }
        }
        clearStoredSession();
      }
    }),
    [session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
