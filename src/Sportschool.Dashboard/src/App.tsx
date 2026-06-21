import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/queryClient";
import { LoginPage } from "./features/auth/LoginPage";
import { SessionProvider } from "./features/auth/SessionProvider";
import { useSession } from "./features/auth/sessionContext";
import { PlatformPage } from "./features/platform/PlatformPage";

function AuthGate() {
  const { session } = useSession();

  if (!session || !session.roles.includes("PlatformOwner")) {
    return <LoginPage />;
  }

  return <PlatformPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthGate />
      </SessionProvider>
    </QueryClientProvider>
  );
}
