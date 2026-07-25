import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/queryClient";
import { LoginPage } from "./features/auth/LoginPage";
import { SessionProvider } from "./features/auth/SessionProvider";
import { useSession } from "./features/auth/sessionContext";
import { PlatformPage } from "./features/platform/PlatformPage";
import { SchoolAdminPage } from "./features/school/SchoolAdminPage";

function AuthGate() {
  const { session } = useSession();

  if (!session) {
    return <LoginPage />;
  }

  if (session.roles.includes("PlatformOwner")) {
    return <PlatformPage />;
  }

  if (session.roles.includes("SchoolAdmin")) {
    return <SchoolAdminPage />;
  }

  return <LoginPage />;
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
