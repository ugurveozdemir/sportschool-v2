import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { endpoints } from "../../../shared/constants/endpoints";
import { getHealth } from "../api/healthApi";

export function HealthPage() {
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, enabled: false });

  return (
    <div>
      <PageHeader title="Sağlık" description="API sağlık kontrolü ve temel bağlantı testi." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void healthQuery.refetch()} path={endpoints.health} title="Bağlantı">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Activity size={20} color="var(--primary)" />
              <span>API yanıtı:</span>
              <StatusBadge value={healthQuery.data?.status ?? "Henüz çalıştırılmadı"} />
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
