import { NavLink, Outlet } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { LogOut, Search, Settings, ShieldCheck } from "lucide-react";
import { navigationItems, secondaryNavigationItems } from "../../config/navigation";
import { clearStoredSession } from "../api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../api/sessionSubscription";
import { getDevMode, setDevMode, subscribeToDevMode } from "../api/viewModeStore";

export function AppLayout() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
  const devMode = useSyncExternalStore(subscribeToDevMode, getDevMode, getDevMode);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <strong style={{ color: "var(--primary)", fontSize: 24 }}>Sportschool</strong>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: 320,
              padding: "8px 12px",
              background: "var(--surface-muted)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--text-muted)"
            }}
          >
            <Search size={18} />
            <span>{devMode ? "Endpoint veya kaynak ara..." : "Arama yapın..."}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Persisted View Mode Switch */}
          <div className="view-mode-toggle">
            <button
              className={`toggle-pill ${!devMode ? "active" : ""}`}
              onClick={() => setDevMode(false)}
              type="button"
            >
              Müşteri Görünümü
            </button>
            <button
              className={`toggle-pill ${devMode ? "active" : ""}`}
              onClick={() => setDevMode(true)}
              type="button"
            >
              Geliştirici Konsolu
            </button>
          </div>

          <span
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text)",
              background: "var(--surface-muted)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              textTransform: "uppercase"
            }}
          >
            Rol: {session?.roles[0] ?? "Oturum Yok"}
          </span>
          <button className="button button-secondary" title="Oturum">
            <ShieldCheck size={17} />
          </button>
          <button className="button button-secondary" title="Ayarlar">
            <Settings size={17} />
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
            <strong>{devMode ? "API Paneli" : "Okul Yönetimi"}</strong>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{devMode ? "Sportschool MVP" : "Sportschool Portal"}</div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: "10px 12px",
            background: devMode ? "var(--surface-muted)" : "var(--success-soft)",
            border: devMode ? "1px solid var(--border)" : "1px solid var(--success)",
            borderRadius: 6,
            fontFamily: devMode ? "JetBrains Mono, monospace" : "inherit",
            fontWeight: devMode ? "normal" : 700,
            color: devMode ? "var(--text)" : "var(--success)",
            fontSize: 13
          }}
        >
          {devMode ? "Ortam: Localhost" : "Sistem: Çevrimiçi"}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navigationItems.map((item) => (
            <NavLink className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} key={item.href} to={item.href}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid var(--border)"
          }}
        >
          {secondaryNavigationItems.map((item) => (
            <a className="nav-link" href={item.href} key={item.label}>
              <item.icon size={19} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
