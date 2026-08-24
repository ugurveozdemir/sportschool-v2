import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { queryClient } from "@/core/queryClient";
import { clearStoredSession, getStoredSession, setStoredSession } from "@/shared/auth/tokenStore";
import type { Session } from "@/shared/types/session";

type SessionContextValue = {
  isReady: boolean;
  session: Session | null;
  setSession: (session: Session) => Promise<void>;
  clearSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

let currentSession: Session | null = null;
let sessionListener: ((session: Session | null) => void) | null = null;

export function getCurrentSession() {
  return currentSession;
}

export async function replaceCurrentSession(session: Session | null) {
  const sessionChanged = !isSameSession(currentSession, session);
  if (sessionChanged) {
    queryClient.clear();
  }

  currentSession = session;
  if (session) {
    await setStoredSession(session);
  } else {
    await clearStoredSession();
  }
  sessionListener?.(session);
}

function isSameSession(current: Session | null, next: Session | null) {
  return current?.userId === next?.userId
    && current?.schoolId === next?.schoolId
    && current?.loginRole === next?.loginRole;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);

  useEffect(() => {
    sessionListener = setSessionState;
    getStoredSession()
      .then((storedSession) => {
        currentSession = storedSession;
        setSessionState(storedSession);
      })
      .finally(() => setIsReady(true));

    return () => {
      sessionListener = null;
    };
  }, []);

  const setSession = useCallback(async (nextSession: Session) => {
    await replaceCurrentSession(nextSession);
  }, []);

  const clearSession = useCallback(async () => {
    await replaceCurrentSession(null);
  }, []);

  const value = useMemo(() => ({ isReady, session, setSession, clearSession }), [clearSession, isReady, session, setSession]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }
  return context;
}
