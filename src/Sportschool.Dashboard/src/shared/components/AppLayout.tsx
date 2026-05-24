import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { platformNavigationItems } from "../../config/navigation";
import { routes } from "../../config/routes";
import { clearStoredSession } from "../api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../api/sessionSubscription";

export function AppLayout() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
  const location = useLocation();
  const isPlatformOwner = session?.roles.includes("PlatformOwner") ?? false;

  if (!session) {
    return <Navigate to={routes.auth} replace state={{ from: location.pathname }} />;
  }

  if (!isPlatformOwner) {
    return (
      <div className="auth-page">
        <section className="auth-panel">
          <h1>Yetkisiz Erişim</h1>
          <p>Bu panel sadece Platform Yöneticileri (PlatformOwner) içindir.</p>
          <button className="button button-primary" onClick={clearStoredSession} type="button">
            Farklı hesapla giriş yap
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="flex items-center gap-6">
          <strong className="text-primary text-2xl font-bold">Sportschool</strong>
          <span className="topbar-context">Platform Paneli</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="role-pill">{session.fullName} · {session.roles[0]}</span>
          <button className="button button-secondary hidden md:inline-flex" title="Oturum">
            <ShieldCheck size={17} />
          </button>
          <button className="button button-danger" onClick={clearStoredSession} type="button">
            <LogOut size={17} />
            <span className="hidden md:inline">Çıkış</span>
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div className="flex items-center gap-3 mb-4.5">
          <div className="grid place-items-center w-10 h-10 text-white font-bold bg-primary-strong rounded-lg">
            SP
          </div>
          <div>
            <strong>Platform Yönetimi</strong>
            <div className="text-muted-foreground text-xs">
              Okul ve admin işlemleri
            </div>
          </div>
        </div>

        <div className="sidebar-status">Sistem: Çevrimiçi</div>

        <nav className="flex flex-col gap-1">
          {platformNavigationItems.map((item) => (
            <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} key={item.href} to={item.href}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <div className="mobile-bottom-nav md:hidden">
        <nav>
          {platformNavigationItems.map((item) => (
            <NavLink className={({ isActive }) => `mobile-bottom-nav-link${isActive ? " active" : ""}`} key={item.href} to={item.href}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
