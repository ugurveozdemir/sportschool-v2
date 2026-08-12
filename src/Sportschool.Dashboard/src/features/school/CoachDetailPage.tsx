import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MailOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Descriptions, Empty, Result, Skeleton, Space, Statistic, Tag, Timeline, Typography } from "antd";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { getCoach, type CoachDetail, type CoachTrainingHistory } from "./coachesApi";

export function CoachDetailPage() {
  const navigate = useNavigate();
  const { coachId } = useParams();
  const coachQuery = useQuery({
    enabled: Boolean(coachId),
    queryKey: ["school", "coaches", coachId],
    queryFn: () => getCoach(coachId!)
  });

  if (coachQuery.isLoading) {
    return <Card><Skeleton active avatar={{ size: 96 }} paragraph={{ rows: 8 }} /></Card>;
  }

  if (coachQuery.error instanceof ApiError && coachQuery.error.status === 404) {
    return (
      <Result
        status="404"
        title="Antrenör bulunamadı"
        subTitle="Antrenör pasife alınmış veya okulunuza ait olmayabilir."
        extra={<Button type="primary" onClick={() => navigate("/antrenorler")}>Antrenörlere dön</Button>}
      />
    );
  }

  if (coachQuery.isError || !coachQuery.data) {
    return (
      <Alert
        showIcon
        type="error"
        message="Antrenör bilgileri yüklenemedi."
        description="Lütfen bağlantınızı kontrol edip tekrar deneyin."
        action={<Button onClick={() => void coachQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const coach = coachQuery.data;
  const completionRate = coach.stats.startedTrainingCount === 0
    ? null
    : Math.round(coach.stats.completedTrainingCount * 100 / coach.stats.startedTrainingCount);
  const completionDescription = completionRate === null
    ? "Henüz başlatılmış antrenman yok"
    : `%${completionRate} tamamlama`;

  return (
    <div>
      <Button className="detail-back-button" icon={<ArrowLeftOutlined />} onClick={() => navigate("/antrenorler")}>
        Antrenörlere dön
      </Button>

      <Card className="coach-profile-card">
        <div className="coach-profile-summary">
          <Avatar size={96} icon={<UserOutlined />} />
          <div>
            <Space wrap>
              <Typography.Title level={2}>{coach.fullName}</Typography.Title>
              <Tag color="green">Aktif antrenör</Tag>
              {coach.roles.includes("SchoolAdmin") && <Tag color="blue">Yönetici</Tag>}
            </Space>
            <Typography.Link href={`mailto:${coach.email}`}><MailOutlined /> {coach.email}</Typography.Link>
          </div>
        </div>
      </Card>

      <div className="coach-stats-grid">
        <StatCard icon={<PlayCircleOutlined />} label="Başlattığı" value={coach.stats.startedTrainingCount} />
        <StatCard icon={<CheckCircleOutlined />} label="Bitirdiği" value={coach.stats.completedTrainingCount} description={completionDescription} />
        <StatCard icon={<CalendarOutlined />} label="Yaklaşan" value={coach.stats.upcomingTrainingCount} />
        <StatCard icon={<ClockCircleOutlined />} label="Devam eden" value={coach.stats.inProgressTrainingCount} />
        <StatCard icon={<FileTextOutlined />} label="Yazdığı rapor" value={coach.stats.reportCount} />
      </div>

      <div className="coach-detail-grid">
        <Card title={<Space><CalendarOutlined /> Sıradaki antrenman</Space>}>
          <NextTraining coach={coach} />
        </Card>
        <Card title="Hesap bilgileri">
          <Descriptions column={1}>
            <Descriptions.Item label={<><MailOutlined /> E-posta</>}>{coach.email}</Descriptions.Item>
            <Descriptions.Item label="Kayıt tarihi">{formatDateTime(coach.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Hesap durumu"><Tag color="green">Aktif</Tag></Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card className="coach-groups-card" title={<Space><TeamOutlined /> Çalıştığı gruplar</Space>}>
        {coach.groups.length > 0
          ? <Space wrap>{coach.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu antrenöre bağlı aktif gruplu antrenman bulunmuyor." />}
      </Card>

      <Card className="coach-history-card" title={<Space><ClockCircleOutlined /> Son antrenmanlar</Space>}>
        {coach.recentTrainings.length > 0
          ? <Timeline items={coach.recentTrainings.map((training) => ({ color: statusColor(training.status), children: <TrainingHistory training={training} /> }))} />
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Henüz başlatılmış antrenman bulunmuyor." />}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, description }: { icon: React.ReactNode; label: string; value: number; description?: string }) {
  return (
    <Card className="coach-stat-card">
      <Space align="start">
        <span className="coach-stat-icon">{icon}</span>
        <div>
          <Statistic title={label} value={value} />
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
      </Space>
    </Card>
  );
}

function NextTraining({ coach }: { coach: CoachDetail }) {
  if (!coach.nextTraining) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Planlı antrenman yok." />;

  return (
    <div className="coach-next-training">
      <Typography.Text strong>{coach.nextTraining.title}</Typography.Text>
      <Typography.Text type="secondary">{formatDateTime(coach.nextTraining.startsAt)}</Typography.Text>
      {coach.nextTraining.groups.length > 0 && <Space wrap>{coach.nextTraining.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>}
    </div>
  );
}

function TrainingHistory({ training }: { training: CoachTrainingHistory }) {
  return (
    <div className="coach-training-history-item">
      <Space wrap>
        <Typography.Text strong>{training.title}</Typography.Text>
        <Tag color={statusColor(training.status)}>{statusLabel(training.status)}</Tag>
      </Space>
      <Typography.Text type="secondary">
        {training.completedAt ? `Tamamlandı · ${formatDateTime(training.completedAt)}` : `Başladı · ${formatDateTime(training.startedAt!)}`}
      </Typography.Text>
      {training.groups.length > 0 && <Space wrap>{training.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>}
    </div>
  );
}

function statusLabel(status: CoachTrainingHistory["status"]): string {
  return status === "Completed" ? "Tamamlandı" : status === "InProgress" ? "Devam ediyor" : "Planlandı";
}

function statusColor(status: CoachTrainingHistory["status"]): string {
  return status === "Completed" ? "green" : status === "InProgress" ? "blue" : "default";
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
