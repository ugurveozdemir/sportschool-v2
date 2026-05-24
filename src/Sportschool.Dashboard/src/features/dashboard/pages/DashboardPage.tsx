import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { routes } from "../../../config/routes";
import { PageHeader } from "../../../shared/components/PageHeader";
import { endOfWeekFromToday, formatDateTime, startOfToday } from "../../../shared/utils/date";
import { getDashboardSummary } from "../api/dashboardApi";

export function DashboardPage() {
  const from = startOfToday().toISOString();
  const to = endOfWeekFromToday().toISOString();
  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", from, to],
    queryFn: () => getDashboardSummary(from, to)
  });
  const summary = summaryQuery.data;

  return (
    <div>
      <PageHeader title="Ana Sayfa" description="Bugünkü işler, hafta görünümü ve takip edilmesi gereken kayıtlar." />

      <div className="metric-grid">
        <MetricCard label="Bu haftaki antrenman" value={summary?.weekTrainingCount ?? "-"} />
        <MetricCard label="Eksik yoklama" value={summary?.missingAttendanceCount ?? "-"} tone={summary?.missingAttendanceCount ? "warning" : "success"} />
        <MetricCard label="Aktif sporcu" value={summary?.activeAthleteCount ?? "-"} />
        <MetricCard label="Bu ay ödeme bekleyen" value={summary?.unpaidPaymentCount ?? "-"} tone={summary?.unpaidPaymentCount ? "warning" : "success"} />
      </div>

      <div className="content-grid">
        <section className="card">
          <div className="card-header">
            <strong>Bugünkü antrenmanlar</strong>
            <Link className="text-link" to={routes.trainings}>Haftayı aç</Link>
          </div>
          <div className="card-body stack">
            {summaryQuery.isLoading ? <div className="empty-state">Yükleniyor...</div> : null}
            {summary?.todayTrainings.length === 0 ? <div className="empty-state">Bugün planlı antrenman yok.</div> : null}
            {summary?.todayTrainings.map((training) => (
              <article className="list-card" key={training.id}>
                <div>
                  <strong>{training.title}</strong>
                  <div className="muted">{training.groupName} · {formatDateTime(training.startsAt)}</div>
                  <div className="muted">{training.location ?? "Konum eklenmemiş"}</div>
                </div>
                <Link className="button button-primary" to={`${routes.attendance}?trainingId=${training.id}`}>Yoklama al</Link>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Son raporlar</strong>
            <Link className="text-link" to={routes.reports}>Raporlara git</Link>
          </div>
          <div className="card-body stack">
            {summary?.recentReports.length === 0 ? <div className="empty-state">Henüz rapor yok.</div> : null}
            {summary?.recentReports.map((report) => (
              <article className="list-card" key={report.id}>
                <div>
                  <strong>{report.athleteName}</strong>
                  <p>{report.summary}</p>
                  <div className="muted">{formatDateTime(report.createdAt)}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: number | string; tone?: "neutral" | "success" | "warning" }) {
  return (
    <section className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
