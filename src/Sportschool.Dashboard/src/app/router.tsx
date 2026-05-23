import { createBrowserRouter, Navigate } from "react-router-dom";
import { routes } from "../config/routes";
import { AuthPage } from "../features/auth/pages/AuthPage";
import { AppLayout } from "../shared/components/AppLayout";
import { PlaceholderPage } from "../shared/components/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: routes.dashboard,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <PlaceholderPage title="Sağlık" description="API sağlık kontrolü ve genel bağlantı durumu." />
      },
      {
        path: "auth",
        element: <AuthPage />
      },
      {
        path: "platform",
        element: <PlaceholderPage title="Platform" description="Okullar ve okul yöneticileri için PlatformOwner işlemleri." />
      },
      {
        path: "school",
        element: <PlaceholderPage title="Okul" description="Okul kullanıcıları, koçlar ve sporcular için yönetim ekranı." />
      },
      {
        path: "applications",
        element: <PlaceholderPage title="Başvurular" description="Sporcu başvurularını oluşturma, listeleme ve karara bağlama." />
      },
      {
        path: "athletes",
        element: <PlaceholderPage title="Sporcular" description="Okula bağlı sporcu listesini inceleme." />
      },
      {
        path: "groups",
        element: <PlaceholderPage title="Gruplar" description="Antrenman grupları ve grup-sporcu üyelikleri." />
      },
      {
        path: "trainings",
        element: <PlaceholderPage title="Antrenmanlar" description="Tekil ve haftalık antrenman seansları." />
      },
      {
        path: "attendance",
        element: <PlaceholderPage title="Yoklama" description="Antrenman seansı bazında sporcu katılım kayıtları." />
      },
      {
        path: "payments",
        element: <PlaceholderPage title="Ödemeler" description="Sporcu aylık ödeme durumları." />
      },
      {
        path: "reports",
        element: <PlaceholderPage title="Raporlar" description="Sporcu gelişim raporları ve skorları." />
      },
      {
        path: "me",
        element: <PlaceholderPage title="Ben" description="Veli/sporcu mobil okuma endpointleri." />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to={routes.auth} replace />
  }
]);
