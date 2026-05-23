import { useSyncExternalStore, type ReactNode } from "react";
import { Send } from "lucide-react";
import { MethodBadge } from "./MethodBadge";
import { getDevMode, subscribeToDevMode } from "../api/viewModeStore";

type EndpointCardProps = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title?: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
};

export function EndpointCard({
  method,
  path,
  title,
  children,
  onSubmit,
  submitLabel = "İsteği Çalıştır",
  isSubmitting = false
}: EndpointCardProps) {
  const devMode = useSyncExternalStore(subscribeToDevMode, getDevMode, getDevMode);

  const resolvedSubmitLabel = submitLabel !== "İsteği Çalıştır"
    ? submitLabel
    : !devMode
      ? (method === "GET" ? "Sorgula" : method === "DELETE" ? "Pasifleştir" : "Kaydet")
      : "İsteği Çalıştır";

  return (
    <section className="card">
      <div className="card-header">
        {devMode ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <MethodBadge method={method} />
              <code style={{ fontSize: 14 }}>{path}</code>
            </div>
            {title ? <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>{title}</span> : null}
          </>
        ) : (
          <span style={{ color: "var(--text)", fontWeight: 700, fontSize: 16 }}>
            {title ?? (method === "GET" ? "Listeleme" : "İşlem Formu")}
          </span>
        )}
      </div>
      <div className="card-body">
        {children}
        {onSubmit ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="button button-primary" disabled={isSubmitting} onClick={onSubmit} type="button">
              {devMode && <Send size={16} />}
              {isSubmitting ? "Gönderiliyor..." : resolvedSubmitLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
