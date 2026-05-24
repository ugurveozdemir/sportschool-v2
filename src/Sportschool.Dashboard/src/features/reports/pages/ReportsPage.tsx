import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField, SelectField, TextareaField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { formatDateTime } from "../../../shared/utils/date";
import { listAthletes } from "../../school/api/schoolApi";
import { createReport, listReports, updateReport } from "../api/reportsApi";

export function ReportsPage() {
  const [athleteId, setAthleteId] = useState("");
  const [reportId, setReportId] = useState("");
  const [report, setReport] = useState({
    summary: "",
    improvementAreas: "",
    speedScore: 0,
    strengthScore: 0,
    dribblingScore: 0,
    shootingScore: 0
  });
  const athletesQuery = useQuery({ queryKey: ["athletes-for-reports"], queryFn: () => listAthletes() });
  const reportsQuery = useQuery({
    queryKey: ["reports", athleteId],
    queryFn: () => listReports(athleteId),
    enabled: Boolean(athleteId)
  });
  const payload = { athleteProfileId: athleteId, ...report };
  const createMutation = useMutation({ mutationFn: () => createReport(payload), onSuccess: () => void reportsQuery.refetch() });
  const updateMutation = useMutation({ mutationFn: () => updateReport(reportId, payload), onSuccess: () => void reportsQuery.refetch() });

  return (
    <div>
      <PageHeader title="Raporlar" description="Sporcu seçerek gelişim raporu oluştur veya geçmiş raporları güncelle." />
      <div className="content-grid">
        <section className="card">
          <div className="card-header">
            <strong>Sporcu raporları</strong>
            <div style={{ width: 320 }}>
              <SelectField label="Sporcu" onChange={(e) => setAthleteId(e.target.value)} value={athleteId}>
                <option value="">Sporcu seç</option>
                {(athletesQuery.data ?? []).map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>{athlete.firstName} {athlete.lastName}</option>
                ))}
              </SelectField>
            </div>
          </div>
          <div className="card-body">
            <DataTable
              emptyText={athleteId ? "Rapor yok." : "Önce sporcu seç."}
              items={reportsQuery.data ?? []}
              columns={[
                { key: "summary", header: "Özet", render: (item) => item.summary },
                { key: "scores", header: "Skorlar", render: (item) => `${item.speedScore}/${item.strengthScore}/${item.dribblingScore}/${item.shootingScore}` },
                { key: "createdAt", header: "Tarih", render: (item) => formatDateTime(item.createdAt) },
                {
                  key: "actions",
                  header: "İşlem",
                  render: (item) => (
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setReportId(item.id);
                        setReport({
                          summary: item.summary,
                          improvementAreas: item.improvementAreas,
                          speedScore: item.speedScore,
                          strengthScore: item.strengthScore,
                          dribblingScore: item.dribblingScore,
                          shootingScore: item.shootingScore
                        });
                      }}
                      type="button"
                    >
                      Düzenle
                    </button>
                  )
                }
              ]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header"><strong>{reportId ? "Raporu güncelle" : "Yeni rapor"}</strong></div>
          <div className="card-body stack">
            <div className="form-grid">
              <TextareaField label="Özet" onChange={(e) => setReport({ ...report, summary: e.target.value })} value={report.summary} />
              <TextareaField label="Gelişim Alanları" onChange={(e) => setReport({ ...report, improvementAreas: e.target.value })} value={report.improvementAreas} />
              <InputField label="Hız" max={10} min={0} onChange={(e) => setReport({ ...report, speedScore: Number(e.target.value) })} step="0.5" type="number" value={report.speedScore} />
              <InputField label="Güç" max={10} min={0} onChange={(e) => setReport({ ...report, strengthScore: Number(e.target.value) })} step="0.5" type="number" value={report.strengthScore} />
              <InputField label="Dribbling" max={10} min={0} onChange={(e) => setReport({ ...report, dribblingScore: Number(e.target.value) })} step="0.5" type="number" value={report.dribblingScore} />
              <InputField label="Şut" max={10} min={0} onChange={(e) => setReport({ ...report, shootingScore: Number(e.target.value) })} step="0.5" type="number" value={report.shootingScore} />
            </div>
            <div className="actions-row">
              {reportId ? <button className="button button-secondary" onClick={() => setReportId("")} type="button">Yeni rapora dön</button> : null}
              <button
                className="button button-primary"
                disabled={!athleteId || !report.summary || !report.improvementAreas}
                onClick={() => (reportId ? updateMutation.mutate() : createMutation.mutate())}
                type="button"
              >
                {reportId ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
