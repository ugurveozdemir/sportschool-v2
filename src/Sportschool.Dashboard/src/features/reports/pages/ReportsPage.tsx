import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField, TextareaField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { endpoints } from "../../../shared/constants/endpoints";
import { createReport, listReports, updateReport } from "../api/reportsApi";

export function ReportsPage() {
  const [athleteProfileId, setAthleteProfileId] = useState("");
  const [reportId, setReportId] = useState("");
  const [report, setReport] = useState({
    athleteProfileId: "",
    summary: "",
    improvementAreas: "",
    speedScore: 0,
    strengthScore: 0,
    dribblingScore: 0,
    shootingScore: 0
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", athleteProfileId],
    queryFn: () => listReports(athleteProfileId),
    enabled: false
  });
  const createMutation = useMutation({
    mutationFn: () => createReport(report),
    onSuccess: () => athleteProfileId && void reportsQuery.refetch()
  });
  const updateMutation = useMutation({
    mutationFn: () => updateReport(reportId, report),
    onSuccess: () => athleteProfileId && void reportsQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Raporlar" description="Sporcu gelişim raporu oluşturma, güncelleme ve listeleme." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard
            method="GET"
            onSubmit={() => athleteProfileId && void reportsQuery.refetch()}
            path={athleteProfileId ? endpoints.schoolAthleteReports(athleteProfileId) : "/api/school/athletes/{athleteProfileId}/reports"}
            title="Rapor listesi"
          >
            <InputField label="AthleteProfileId" onChange={(e) => setAthleteProfileId(e.target.value)} value={athleteProfileId} />
            <div style={{ marginTop: 16 }}>
              <DataTable
                emptyText="Rapor yok."
                items={reportsQuery.data ?? []}
                columns={[
                  { key: "summary", header: "Özet", render: (item) => item.summary },
                  { key: "scores", header: "Skorlar", render: (item) => `${item.speedScore}/${item.strengthScore}/${item.dribblingScore}/${item.shootingScore}` },
                  { key: "createdAt", header: "Tarih", render: (item) => new Date(item.createdAt).toLocaleString("tr-TR") },
                  {
                    key: "actions",
                    header: "İşlem",
                    render: (item) => (
                      <button
                        className="button button-secondary"
                        onClick={() => {
                          setReportId(item.id);
                          setReport({
                            athleteProfileId: item.athleteProfileId,
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
                        Seç
                      </button>
                    )
                  }
                ]}
              />
            </div>
          </EndpointCard>

          <EndpointCard
            method="POST"
            onSubmit={() => createMutation.mutate()}
            path={endpoints.athleteReports}
            title="Rapor kaydet"
          >
            <ReportForm report={report} reportId={reportId} setReport={setReport} setReportId={setReportId} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="button button-secondary" onClick={() => reportId && updateMutation.mutate()} type="button">
                Seçili Raporu Güncelle
              </button>
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}

function ReportForm({
  report,
  reportId,
  setReport,
  setReportId
}: {
  report: {
    athleteProfileId: string;
    summary: string;
    improvementAreas: string;
    speedScore: number;
    strengthScore: number;
    dribblingScore: number;
    shootingScore: number;
  };
  reportId: string;
  setReport: (report: {
    athleteProfileId: string;
    summary: string;
    improvementAreas: string;
    speedScore: number;
    strengthScore: number;
    dribblingScore: number;
    shootingScore: number;
  }) => void;
  setReportId: (value: string) => void;
}) {
  return (
    <div className="form-grid">
      <InputField label="ReportId" onChange={(e) => setReportId(e.target.value)} value={reportId} />
      <InputField label="AthleteProfileId" onChange={(e) => setReport({ ...report, athleteProfileId: e.target.value })} value={report.athleteProfileId} />
      <TextareaField label="Özet" onChange={(e) => setReport({ ...report, summary: e.target.value })} value={report.summary} />
      <TextareaField label="Gelişim Alanları" onChange={(e) => setReport({ ...report, improvementAreas: e.target.value })} value={report.improvementAreas} />
      <InputField label="Hız" onChange={(e) => setReport({ ...report, speedScore: Number(e.target.value) })} step="0.5" type="number" value={report.speedScore} />
      <InputField label="Güç" onChange={(e) => setReport({ ...report, strengthScore: Number(e.target.value) })} step="0.5" type="number" value={report.strengthScore} />
      <InputField label="Dribbling" onChange={(e) => setReport({ ...report, dribblingScore: Number(e.target.value) })} step="0.5" type="number" value={report.dribblingScore} />
      <InputField label="Şut" onChange={(e) => setReport({ ...report, shootingScore: Number(e.target.value) })} step="0.5" type="number" value={report.shootingScore} />
    </div>
  );
}
