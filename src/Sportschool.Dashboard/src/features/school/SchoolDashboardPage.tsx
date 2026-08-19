import { CalendarOutlined, CheckCircleOutlined, TeamOutlined, UserOutlined, WalletOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Empty, List, Statistic, Tag, Typography } from "antd";
import { apiRequest } from "../../app/api/apiClient";
import { getSession } from "../../app/auth/sessionStore";

type DashboardSummary = {
  todayTrainings: TrainingItem[];
  weekTrainingCount: number;
  missingAttendanceCount: number;
  activeAthleteCount: number;
  activeGroupCount: number;
  unpaidPaymentCount: number;
  recentReports: RecentReport[];
};

type TrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groups: { id: string; name: string }[];
  coachName: string;
  location: string | null;
  totalAthletes: number;
  recordedAttendanceCount: number;
  startedAt: string | null;
  completedAt: string | null;
  recordedReportCount: number;
  presentCount: number;
};

type RecentReport = {
  id: string;
  athleteName: string;
  summary: string;
  createdAt: string;
};

export function SchoolDashboardPage() {
  const session = getSession();
  const summaryQuery = useQuery({
    queryKey: ["school", "dashboard", "summary"],
    queryFn: () => apiRequest<DashboardSummary>("/api/school/dashboard/summary")
  });
  const summary = summaryQuery.data;

  return (
    <div>
      <Typography.Title level={2}>Hoş geldin, {session?.fullName}</Typography.Title>
      <Typography.Paragraph type="secondary">Okulundaki güncel operasyonları buradan takip et.</Typography.Paragraph>

      <div className="dashboard-stats">
        <Card loading={summaryQuery.isLoading}><Statistic title="Aktif sporcu" value={summary?.activeAthleteCount} prefix={<UserOutlined />} /></Card>
        <Card loading={summaryQuery.isLoading}><Statistic title="Aktif grup" value={summary?.activeGroupCount} prefix={<TeamOutlined />} /></Card>
        <Card loading={summaryQuery.isLoading}><Statistic title="Bu haftaki antrenman" value={summary?.weekTrainingCount} prefix={<CalendarOutlined />} /></Card>
        <Card loading={summaryQuery.isLoading}><Statistic title="Eksik yoklama" value={summary?.missingAttendanceCount} valueStyle={{ color: summary?.missingAttendanceCount ? "#d97706" : undefined }} prefix={<CheckCircleOutlined />} /></Card>
        <Card loading={summaryQuery.isLoading}><Statistic title="Ödenmemiş aidat" value={summary?.unpaidPaymentCount} valueStyle={{ color: summary?.unpaidPaymentCount ? "#dc2626" : undefined }} prefix={<WalletOutlined />} /></Card>
      </div>

      {summaryQuery.isError && <Card><Empty description="Dashboard verisi yüklenemedi." /></Card>}

      {!summaryQuery.isError && (
        <div className="dashboard-content-grid">
          <Card title="Bugünkü antrenmanlar" loading={summaryQuery.isLoading}>
            {summary?.todayTrainings.length ? (
              <List
                dataSource={summary.todayTrainings}
                renderItem={(training) => (
                  <List.Item>
                    <List.Item.Meta
                      title={training.title}
                      description={`${formatTime(training.startsAt)} · ${training.coachName}${training.location ? ` · ${training.location}` : ""}`}
                    />
                    <div>
                      <Tag color={training.completedAt ? "green" : training.startedAt ? "blue" : "default"}>
                        {training.completedAt ? "Tamamlandı" : training.startedAt ? "Devam ediyor" : "Planlandı"}
                      </Tag>
                      <Typography.Text type="secondary">
                        {training.recordedAttendanceCount}/{training.totalAthletes} yoklama girildi
                        {training.startedAt ? ` · ${training.recordedReportCount}/${training.presentCount} rapor` : ""}
                      </Typography.Text>
                    </div>
                  </List.Item>
                )}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bugün planlanmış antrenman yok." />}
          </Card>

          <Card title="Son gelişim raporları" loading={summaryQuery.isLoading}>
            {summary?.recentReports.length ? (
              <List
                dataSource={summary.recentReports}
                renderItem={(report) => (
                  <List.Item>
                    <List.Item.Meta
                      title={report.athleteName}
                      description={report.summary}
                    />
                    <Typography.Text type="secondary">{formatDate(report.createdAt)}</Typography.Text>
                  </List.Item>
                )}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Henüz gelişim raporu yok." />}
          </Card>
        </div>
      )}
    </div>
  );
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(new Date(value));
}
