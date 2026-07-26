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
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router";
import { authProvider } from "./app/auth/authProvider";
import { getStoredSession, type UserRole } from "./app/auth/sessionStore";
import { LoginPage } from "./app/pages/LoginPage";
import { SchoolsPage } from "./features/platform/SchoolsPage";
import { AthletesPage } from "./features/school/AthletesPage";
import { CoachesPage } from "./features/school/CoachesPage";
import { GroupsPage } from "./features/school/GroupsPage";
import { SchoolDashboardPage } from "./features/school/SchoolDashboardPage";
import { TrainingsPage } from "./features/school/TrainingsPage";

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
                    {module.path === "/sporcular" ? <AthletesPage /> : module.path === "/antrenorler" ? <CoachesPage /> : module.path === "/gruplar" ? <GroupsPage /> : module.path === "/antrenmanlar" ? <TrainingsPage /> : <ModulePage module={module} />}
                  </RoleGuard>
                }
              />
            ))}
          </Route>
          <Route path="*" element={<CatchAllNavigate to="/" />} />
        </Routes>
      </Refine>
    </BrowserRouter>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = getStoredSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  if (!session) return null;

  const isPlatformOwner = session.loginRole === "PlatformOwner";
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
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
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
        <Layout.Content className="app-content">{children}</Layout.Content>
      </Layout>
    </Layout>
  );
}

function DashboardHome() {
  const session = getStoredSession();
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

function RoleGuard({ children, roles }: { children: React.ReactNode; roles: UserRole[] }) {
  const session = getStoredSession();
  return session && roles.includes(session.loginRole) ? children : <Navigate to="/" replace />;
}
