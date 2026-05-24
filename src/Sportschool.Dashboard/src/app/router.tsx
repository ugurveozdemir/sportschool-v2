import { createBrowserRouter, Navigate } from "react-router-dom";
import { routes } from "../config/routes";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { AccountPage } from "../features/account/pages/AccountPage";
import { PlatformPage } from "../features/platform/pages/PlatformPage";
import { AppLayout } from "../shared/components/AppLayout";

export const router = createBrowserRouter([
  {
    path: routes.auth,
    element: <AuthPage />
  },
  {
    path: routes.dashboard,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to={routes.platform} replace />
      },
      {
        path: "platform",
        element: <PlatformPage />
      },
      {
        path: "account",
        element: <AccountPage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to={routes.auth} replace />
  }
]);
