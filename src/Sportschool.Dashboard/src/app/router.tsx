import { createBrowserRouter, Navigate } from "react-router-dom";
import { routes } from "../config/routes";
import { ApplicationsPage } from "../features/applications/pages/ApplicationsPage";
import { AttendancePage } from "../features/attendance/pages/AttendancePage";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { GroupsPage } from "../features/groups/pages/GroupsPage";
import { HealthPage } from "../features/health/pages/HealthPage";
import { MePage } from "../features/me/pages/MePage";
import { PaymentsPage } from "../features/payments/pages/PaymentsPage";
import { PlatformPage } from "../features/platform/pages/PlatformPage";
import { ReportsPage } from "../features/reports/pages/ReportsPage";
import { AthletesPage } from "../features/school/pages/AthletesPage";
import { SchoolPage } from "../features/school/pages/SchoolPage";
import { TrainingsPage } from "../features/trainings/pages/TrainingsPage";
import { AppLayout } from "../shared/components/AppLayout";

export const router = createBrowserRouter([
  {
    path: routes.dashboard,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HealthPage />
      },
      {
        path: "auth",
        element: <AuthPage />
      },
      {
        path: "platform",
        element: <PlatformPage />
      },
      {
        path: "school",
        element: <SchoolPage />
      },
      {
        path: "applications",
        element: <ApplicationsPage />
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
        path: "me",
        element: <MePage />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to={routes.auth} replace />
  }
]);
