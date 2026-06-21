import { createContext, useContext } from "react";
import type { AuthSession } from "../../shared/types/session";
import type { LoginInput } from "./authApi";

export type SessionContextValue = {
  session: AuthSession | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider.");
  }
  return context;
}
