import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { endpoints } from "../../../shared/constants/endpoints";
import { listAthletes } from "../api/schoolApi";

export function AthletesPage() {
  const athletesQuery = useQuery({ queryKey: ["athletes"], queryFn: listAthletes, enabled: false });

  return (
    <div>
      <PageHeader title="Sporcular" description="Okula bağlı sporcu profilleri." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void athletesQuery.refetch()} path={endpoints.schoolAthletes} title="Sporcu listesi">
            <DataTable
              emptyText="Sporcu yok."
              items={athletesQuery.data ?? []}
              columns={[
                { key: "name", header: "Ad Soyad", render: (item) => `${item.firstName} ${item.lastName}` },
                { key: "birthDate", header: "Doğum", render: (item) => item.birthDate },
                { key: "parent", header: "Veli", render: (item) => item.parentFullName },
                { key: "phone", header: "Telefon", render: (item) => item.parentPhone },
                { key: "id", header: "AthleteProfileId", render: (item) => <code>{item.id}</code> }
              ]}
            />
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
