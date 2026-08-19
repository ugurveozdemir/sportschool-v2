import {
  ApartmentOutlined,
  CalendarOutlined,
  DollarOutlined,
  NotificationOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Authenticated, Refine, useLogout } from "@refinedev/core";
import routerProvider, { CatchAllNavigate } from "@refinedev/react-router";
import { Avatar, Button, Card, Layout, Menu, Space, Typography, type MenuProps } from "antd";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router";
import { authProvider } from "./app/auth/authProvider";
import { getSession, type UserRole } from "./app/auth/sessionStore";
import { LoginPage } from "./app/pages/LoginPage";

const SchoolsPage = lazy(() => import("./features/platform/SchoolsPage").then(({ SchoolsPage }) => ({ default: SchoolsPage })));
const AthletesPage = lazy(() => import("./features/school/AthletesPage").then(({ AthletesPage }) => ({ default: AthletesPage })));
const AthleteDetailPage = lazy(() => import("./features/school/AthleteDetailPage").then(({ AthleteDetailPage }) => ({ default: AthleteDetailPage })));
const AnnouncementsPage = lazy(() => import("./features/school/AnnouncementsPage").then(({ AnnouncementsPage }) => ({ default: AnnouncementsPage })));
const CoachesPage = lazy(() => import("./features/school/CoachesPage").then(({ CoachesPage }) => ({ default: CoachesPage })));
const CoachDetailPage = lazy(() => import("./features/school/CoachDetailPage").then(({ CoachDetailPage }) => ({ default: CoachDetailPage })));
const GroupDetailPage = lazy(() => import("./features/school/GroupDetailPage").then(({ GroupDetailPage }) => ({ default: GroupDetailPage })));
const GroupsPage = lazy(() => import("./features/school/GroupsPage").then(({ GroupsPage }) => ({ default: GroupsPage })));
const PaymentsPage = lazy(() => import("./features/school/PaymentsPage").then(({ PaymentsPage }) => ({ default: PaymentsPage })));
const SchoolDashboardPage = lazy(() => import("./features/school/SchoolDashboardPage").then(({ SchoolDashboardPage }) => ({ default: SchoolDashboardPage })));
const SettingsPage = lazy(() => import("./features/school/SettingsPage").then(({ SettingsPage }) => ({ default: SettingsPage })));
const TrainingDetailPage = lazy(() => import("./features/school/TrainingDetailPage").then(({ TrainingDetailPage }) => ({ default: TrainingDetailPage })));
const TrainingsPage = lazy(() => import("./features/school/TrainingsPage").then(({ TrainingsPage }) => ({ default: TrainingsPage })));

type AppModule = {
  path: string;
  title: string;
  description: string;
  roles: UserRole[];
};

const schoolModules: AppModule[] = [
  { path: "/", title: "Ana Sayfa", description: "Okulunuzun günlük durumunu buradan takip edeceksiniz.", roles: ["SchoolAdmin"] },
  { path: "/sporcular", title: "Sporcular", description: "Sporcu ve veli bilgilerini yönetin.", roles: ["SchoolAdmin"] },
  { path: "/antrenorler", title: "Antrenörler", description: "Antrenör hesaplarını yönetin.", roles: ["SchoolAdmin"] },
  { path: "/gruplar", title: "Gruplar", description: "Grupları ve sporcu kadrolarını düzenleyin.", roles: ["SchoolAdmin"] },
  { path: "/antrenmanlar", title: "Antrenmanlar", description: "Antrenman programını planlayın.", roles: ["SchoolAdmin"] },
  { path: "/odemeler", title: "Ödemeler", description: "Aylık aidat durumunu takip edin.", roles: ["SchoolAdmin"] },
  { path: "/duyurular", title: "Duyurular", description: "Veli ve sporculara duyuru yayınlayın.", roles: ["SchoolAdmin"] },
  { path: "/ayarlar", title: "Ayarlar", description: "Okul ve hesap ayarlarınızı yönetin.", roles: ["SchoolAdmin"] }
];

const platformModules: AppModule[] = [
  { path: "/", title: "Okullar", description: "Okulları ve okul yöneticilerini yönetin.", roles: ["PlatformOwner"] }
];

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Refine authProvider={authProvider} routerProvider={routerProvider} options={{ syncWithLocation: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <Authenticated key="dashboard" redirectOnFail="/login">
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </Authenticated>
            }
          >
            <Route index element={<DashboardHome />} />
            {schoolModules.slice(1).map((module) => (
              <Route
                key={module.path}
                path={module.path}
                element={
                  <RoleGuard roles={module.roles}>
                    <SchoolModulePage module={module} />
                  </RoleGuard>
                }
              />
            ))}
            <Route
              path="/sporcular/:athleteId"
              element={
                <RoleGuard roles={["SchoolAdmin"]}>
                  <AthleteDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/antrenorler/:coachId"
              element={
                <RoleGuard roles={["SchoolAdmin"]}>
                  <CoachDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/gruplar/:groupId"
              element={
                <RoleGuard roles={["SchoolAdmin"]}>
                  <GroupDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="/antrenmanlar/:trainingId"
              element={
                <RoleGuard roles={["SchoolAdmin"]}>
                  <TrainingDetailPage />
                </RoleGuard>
              }
            />
          </Route>
          <Route path="*" element={<CatchAllNavigate to="/" />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  if (!session) return null;

  const isPlatformOwner = session.loginRole === "PlatformOwner";
  const selectedMenuKey = location.pathname.startsWith("/sporcular/")
    ? "/sporcular"
    : location.pathname.startsWith("/antrenorler/")
      ? "/antrenorler"
      : location.pathname.startsWith("/gruplar/")
        ? "/gruplar"
        : location.pathname.startsWith("/antrenmanlar/")
          ? "/antrenmanlar"
        : location.pathname;
  const menuItems: MenuProps["items"] = isPlatformOwner
    ? [{ key: "/", icon: <ApartmentOutlined />, label: "Okullar" }]
    : [
        { key: "/", icon: <ApartmentOutlined />, label: "Ana Sayfa" },
        { key: "/sporcular", icon: <TeamOutlined />, label: "Sporcular" },
        { key: "/antrenorler", icon: <UserOutlined />, label: "Antrenörler" },
        { key: "/gruplar", icon: <TeamOutlined />, label: "Gruplar" },
        { key: "/antrenmanlar", icon: <CalendarOutlined />, label: "Antrenmanlar" },
        { key: "/odemeler", icon: <DollarOutlined />, label: "Ödemeler" },
        { key: "/duyurular", icon: <NotificationOutlined />, label: "Duyurular" },
        { key: "/ayarlar", icon: <SettingOutlined />, label: "Ayarlar" }
      ];

  return (
    <Layout className="app-layout">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" width={244} className="app-sider">
        <div className="brand">Sportschool</div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedMenuKey]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Layout.Sider>
      <Layout>
        <Layout.Header className="app-header">
          <Typography.Text strong>{isPlatformOwner ? "Platform Yönetimi" : "Okul Yönetimi"}</Typography.Text>
          <Space size="middle">
            <Space size="small">
              <Avatar>{session.fullName.slice(0, 1).toLocaleUpperCase("tr-TR")}</Avatar>
              <span className="user-name">{session.fullName}</span>
            </Space>
            <Button loading={isLoggingOut} onClick={() => logout()}>Çıkış</Button>
          </Space>
        </Layout.Header>
        <Layout.Content className="app-content">
          <Suspense fallback={<Card loading bordered={false} />}>
            {children}
          </Suspense>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

function DashboardHome() {
  const session = getSession();
  const isPlatformOwner = session?.loginRole === "PlatformOwner";
  if (isPlatformOwner) return <SchoolsPage />;

  if (!isPlatformOwner) return <SchoolDashboardPage />;

  const modules = platformModules;

  return (
    <div>
      <Typography.Title level={2}>Hoş geldin, {session?.fullName}</Typography.Title>
      <Typography.Paragraph type="secondary">
        {isPlatformOwner ? "Okul ve yönetici işlemlerini buradan yöneteceksin." : "Okul operasyonları için panel temelini hazırlıyoruz."}
      </Typography.Paragraph>
      <div className="module-grid">
        {modules.map((module) => (
          <Card key={module.path} title={module.title} className="module-card">
            <Typography.Paragraph type="secondary">{module.description}</Typography.Paragraph>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ModulePage({ module }: { module: AppModule }) {
  return (
    <Card title={module.title} className="page-card">
      <Typography.Paragraph>{module.description}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">Bu modülün API bağlantısını ve yönetim ekranlarını sıradaki küçük adımda ekleyeceğiz.</Typography.Paragraph>
    </Card>
  );
}

function SchoolModulePage({ module }: { module: AppModule }) {
  switch (module.path) {
    case "/sporcular": return <AthletesPage />;
    case "/antrenorler": return <CoachesPage />;
    case "/gruplar": return <GroupsPage />;
    case "/antrenmanlar": return <TrainingsPage />;
    case "/odemeler": return <PaymentsPage />;
    case "/duyurular": return <AnnouncementsPage />;
    case "/ayarlar": return <SettingsPage />;
    default: return <ModulePage module={module} />;
  }
}

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const session = getSession();
  return session && roles.includes(session.loginRole) ? children : <Navigate to="/" replace />;
}
