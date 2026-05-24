import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { navigationItems } from "../../config/navigation";
import { routes } from "../../config/routes";
import { clearStoredSession } from "../api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../api/sessionSubscription";

export function AppLayout() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
  const location = useLocation();
  const isStaff = session?.roles.some((role) => role === "Coach" || role === "SchoolAdmin") ?? false;

  if (!session) {
    return <Navigate to={routes.auth} replace state={{ from: location.pathname }} />;
  }

  if (!isStaff) {
    return (
      <div className="auth-page">
        <section className="auth-panel">
          <h1>Bu panel eğitmenler içindir</h1>
          <p>Coach veya SchoolAdmin rolüyle giriş yapmalısın.</p>
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
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <strong style={{ color: "var(--primary)", fontSize: 24 }}>Sportschool</strong>
          <span className="topbar-context">Eğitmen Paneli</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="role-pill">{session.fullName} · {session.roles[0]}</span>
          <button className="button button-secondary" title="Oturum">
            <ShieldCheck size={17} />
          </button>
          <button className="button button-danger" onClick={clearStoredSession} type="button">
            <LogOut size={17} />
            Çıkış
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div
            style={{
              display: "grid",
              placeItems: "center",
              width: 42,
              height: 42,
              color: "#fff",
              fontWeight: 700,
              background: "var(--primary-strong)",
              borderRadius: 10
            }}
          >
            SP
          </div>
          <div>
            <strong>Okul Yönetimi</strong>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Günlük operasyon</div>
          </div>
        </div>

        <div className="sidebar-status">Sistem: Çevrimiçi</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navigationItems.map((item) => (
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
    </div>
  );
}
