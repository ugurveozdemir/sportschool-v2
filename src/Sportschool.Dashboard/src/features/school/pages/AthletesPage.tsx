import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { formatDate, formatDateTime } from "../../../shared/utils/date";
import type { AthleteRosterResponse } from "../../../shared/types/domain";
import { listPayments } from "../../payments/api/paymentsApi";
import { listReports } from "../../reports/api/reportsApi";
import { listAthletes } from "../api/schoolApi";

export function AthletesPage() {
  const [search, setSearch] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteRosterResponse | null>(null);
  const athletesQuery = useQuery({ queryKey: ["athletes", search], queryFn: () => listAthletes(search) });
  const paymentsQuery = useQuery({
    queryKey: ["athlete-payments", selectedAthlete?.id],
    queryFn: () => listPayments(selectedAthlete!.id),
    enabled: Boolean(selectedAthlete)
  });
  const reportsQuery = useQuery({
    queryKey: ["athlete-reports", selectedAthlete?.id],
    queryFn: () => listReports(selectedAthlete!.id),
    enabled: Boolean(selectedAthlete)
  });

  return (
    <div>
      <PageHeader title="Sporcular" description="Sporcu arama, veli bilgileri, ödeme ve gelişim geçmişi." />
      <div className="content-grid">
        <section className="card">
          <div className="card-header">
            <strong>Sporcu listesi</strong>
            <div style={{ width: 280 }}>
              <InputField label="Arama" onChange={(e) => setSearch(e.target.value)} placeholder="Sporcu veya veli adı" value={search} />
            </div>
          </div>
          <div className="card-body">
            <DataTable
              emptyText={athletesQuery.isLoading ? "Yükleniyor..." : "Sporcu bulunamadı."}
              items={athletesQuery.data ?? []}
              columns={[
                { key: "name", header: "Sporcu", render: (item) => `${item.firstName} ${item.lastName}` },
                { key: "birthDate", header: "Doğum", render: (item) => formatDate(item.birthDate) },
                { key: "parent", header: "Veli", render: (item) => item.parentFullName },
                { key: "phone", header: "Telefon", render: (item) => item.parentPhone },
                {
                  key: "actions",
                  header: "İşlem",
                  render: (item) => (
                    <button className="button button-secondary" onClick={() => setSelectedAthlete(item)} type="button">
                      Detay
                    </button>
                  )
                }
              ]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Sporcu detayı</strong>
          </div>
          <div className="card-body stack">
            {!selectedAthlete ? <div className="empty-state">Detay için bir sporcu seç.</div> : null}
            {selectedAthlete ? (
              <>
                <div className="profile-summary">
                  <strong>{selectedAthlete.firstName} {selectedAthlete.lastName}</strong>
                  <span>{selectedAthlete.parentFullName} · {selectedAthlete.parentPhone}</span>
                </div>
                <div>
                  <h3>Ödemeler</h3>
                  <DataTable
                    emptyText="Ödeme kaydı yok."
                    items={paymentsQuery.data ?? []}
                    columns={[
                      { key: "period", header: "Dönem", render: (item) => `${item.month}/${item.year}` },
                      { key: "amount", header: "Tutar", render: (item) => item.amount },
                      { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.effectiveStatus} /> }
                    ]}
                  />
                </div>
                <div>
                  <h3>Raporlar</h3>
                  <DataTable
                    emptyText="Rapor kaydı yok."
                    items={reportsQuery.data ?? []}
                    columns={[
                      { key: "summary", header: "Özet", render: (item) => item.summary },
                      { key: "createdAt", header: "Tarih", render: (item) => formatDateTime(item.createdAt) }
                    ]}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
