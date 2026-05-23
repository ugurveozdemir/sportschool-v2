import { useSyncExternalStore } from "react";
import { Copy, TerminalSquare } from "lucide-react";
import { getLastResponse, subscribeToLastResponse } from "../api/lastResponseStore";

export function ResponseInspector() {
  const response = useSyncExternalStore(subscribeToLastResponse, getLastResponse, getLastResponse);
  const statusLabel = response ? `${response.status} ${response.ok ? "OK" : "Hata"}` : "Hazır";

  return (
    <aside className="card" style={{ overflow: "hidden", position: "sticky", top: 88 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          color: "#fff",
          background: "#0f172a",
          borderBottom: "1px solid #334155"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
          <TerminalSquare size={18} />
          Yanıt İnceleyici
        </div>
        <span style={{ color: response?.ok ? "#4ade80" : "#f87171", fontFamily: "JetBrains Mono, monospace" }}>
          {statusLabel}
        </span>
      </div>
      <pre
        style={{
          minHeight: 460,
          maxHeight: "calc(100vh - 220px)",
          margin: 0,
          padding: 18,
          overflow: "auto",
          color: "#bfdbfe",
          background: "var(--code-panel)",
          fontSize: 13,
          lineHeight: "20px"
        }}
      >
        {response ? JSON.stringify(response.body, null, 2) : "Henüz istek gönderilmedi."}
      </pre>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          color: "#e5e7eb",
          background: "#0f172a",
          borderTop: "1px solid #334155"
        }}
      >
        <span style={{ fontSize: 13 }}>{response ? `${response.method} ${response.path} - ${response.durationMs}ms` : ""}</span>
        <button
          className="button"
          onClick={() => response && navigator.clipboard.writeText(JSON.stringify(response.body, null, 2))}
          style={{ minHeight: 32, color: "#e5e7eb", background: "transparent", borderColor: "#334155" }}
          type="button"
        >
          <Copy size={15} />
          JSON Kopyala
        </button>
      </div>
    </aside>
  );
}
