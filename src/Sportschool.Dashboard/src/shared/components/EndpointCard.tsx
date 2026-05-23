import type { ReactNode } from "react";
import { Send } from "lucide-react";
import { MethodBadge } from "./MethodBadge";

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
  return (
    <section className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <MethodBadge method={method} />
          <code style={{ fontSize: 14 }}>{path}</code>
        </div>
        {title ? <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 13 }}>{title}</span> : null}
      </div>
      <div className="card-body">
        {children}
        {onSubmit ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <button className="button button-primary" disabled={isSubmitting} onClick={onSubmit} type="button">
              <Send size={16} />
              {isSubmitting ? "Gönderiliyor" : submitLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
