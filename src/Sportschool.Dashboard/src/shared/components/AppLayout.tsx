import { NavLink, Outlet } from "react-router-dom";
import { useSyncExternalStore } from "react";
import { LogOut, Search, Settings, ShieldCheck } from "lucide-react";
import { navigationItems, secondaryNavigationItems } from "../../config/navigation";
import { clearStoredSession } from "../api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../api/sessionSubscription";

export function AppLayout() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);

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
            <span>Endpoint veya kaynak ara...</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <strong>API Paneli</strong>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Sportschool MVP</div>
          </div>
        </div>

        <div
          style={{
            marginBottom: 20,
            padding: "10px 12px",
            background: "var(--surface-muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13
          }}
        >
          Ortam: Localhost
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
