import { useSyncExternalStore } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { clearStoredSession, storeSession } from "../../../shared/api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../../../shared/api/sessionSubscription";
import { refreshSession, logout } from "../api/authApi";

export function SessionSummary() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
  const refreshMutation = useMutation({
    mutationFn: () => refreshSession({ refreshToken: session?.refreshToken ?? "" }),
    onSuccess: storeSession
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(session?.refreshToken ?? ""),
    onSettled: clearStoredSession
  });

  return (
    <section className="card">
      <div className="card-header">
        <strong>Oturum</strong>
        <span style={{ color: session ? "var(--success)" : "var(--warning)", fontWeight: 700 }}>
          {session ? "Aktif" : "Yok"}
        </span>
      </div>
      <div className="card-body" style={{ display: "grid", gap: 12 }}>
        {session ? (
          <>
            <Info label="Kullanıcı" value={session.fullName} />
            <Info label="E-posta" value={session.email} />
            <Info label="Roller" value={session.roles.join(", ")} />
            <Info label="SchoolId" value={session.schoolId ?? "-"} mono />
            <Info label="Token Bitişi" value={new Date(session.accessTokenExpiresAt).toLocaleString("tr-TR")} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="button button-secondary" onClick={() => refreshMutation.mutate()} type="button">
                <RefreshCw size={16} />
                Yenile
              </button>
              <button className="button button-danger" onClick={() => logoutMutation.mutate()} type="button">
                <Trash2 size={16} />
                Oturumu Temizle
              </button>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: "var(--text-muted)" }}>Giriş yapınca token ve kullanıcı bilgileri burada görünür.</p>
        )}
      </div>
    </section>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div className={mono ? "font-code" : undefined} style={{ overflowWrap: "anywhere" }}>
        {value}
      </div>
    </div>
  );
}
