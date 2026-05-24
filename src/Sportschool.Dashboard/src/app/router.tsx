import { createBrowserRouter, Navigate } from "react-router-dom";
import { routes } from "../config/routes";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { AttendancePage } from "../features/attendance/pages/AttendancePage";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { GroupsPage } from "../features/groups/pages/GroupsPage";
import { AccountPage } from "../features/account/pages/AccountPage";
import { PaymentsPage } from "../features/payments/pages/PaymentsPage";
import { ReportsPage } from "../features/reports/pages/ReportsPage";
import { AthletesPage } from "../features/school/pages/AthletesPage";
import { TrainingsPage } from "../features/trainings/pages/TrainingsPage";
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
        element: <DashboardPage />
      },
      {
        path: "athletes",
        element: <AthletesPage />
      },
      {
        path: "groups",
        element: <GroupsPage />
      },
      {
        path: "trainings",
        element: <TrainingsPage />
      },
      {
        path: "attendance",
        element: <AttendancePage />
      },
      {
        path: "payments",
        element: <PaymentsPage />
      },
      {
        path: "reports",
        element: <ReportsPage />
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
