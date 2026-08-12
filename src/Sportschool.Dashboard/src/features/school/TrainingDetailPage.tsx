import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Descriptions, Progress, Result, Space, Statistic, Tag, Typography } from "antd";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { getTraining, type Training } from "./trainingsApi";

type TrainingStatus = "Scheduled" | "InProgress" | "Completed" | "Missed";

export function TrainingDetailPage() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const trainingQuery = useQuery({
    enabled: Boolean(trainingId),
    queryKey: ["school", "trainings", trainingId],
    queryFn: () => getTraining(trainingId!)
  });

  if (trainingQuery.isLoading) {
    return <Card loading className="training-detail-card" />;
  }

  if (trainingQuery.error instanceof ApiError && trainingQuery.error.status === 404) {
    return (
      <Result
        status="404"
        title="Antrenman bulunamadı"
        subTitle="Antrenman iptal edilmiş, pasife alınmış veya okulunuza ait olmayabilir."
        extra={<Button type="primary" onClick={() => navigate("/antrenmanlar")}>Antrenmanlara dön</Button>}
      />
    );
  }

  if (trainingQuery.isError || !trainingQuery.data) {
    return (
      <Alert
        showIcon
        type="error"
        message="Antrenman bilgileri yüklenemedi."
        description="Lütfen bağlantınızı kontrol edip tekrar deneyin."
        action={<Button onClick={() => void trainingQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const training = trainingQuery.data;
  const status = getTrainingStatus(training, new Date());
  const attendancePercent = training.attendanceSummary.totalAthletes === 0
    ? 0
    : Math.round(training.attendanceSummary.recordedCount / training.attendanceSummary.totalAthletes * 100);

  return (
    <div>
      <Button className="detail-back-button" icon={<ArrowLeftOutlined />} onClick={() => navigate("/antrenmanlar")}>
        Antrenmanlara dön
      </Button>

      <Card className="training-detail-hero">
        <div className="training-detail-heading">
          <div>
            <Space wrap>
              <Typography.Title level={2}>{training.title}</Typography.Title>
              <TrainingStatusTag status={status} />
            </Space>
            <Typography.Paragraph type="secondary">
              {formatDate(training.startsAt)} · {formatTime(training.startsAt)} – {formatTime(training.endsAt)}
            </Typography.Paragraph>
            <Space className="training-detail-meta" size={[16, 8]} wrap>
              <span><UserOutlined /> {training.coachName}</span>
              {training.location && <span><EnvironmentOutlined /> {training.location}</span>}
            </Space>
          </div>
        </div>
      </Card>

      <div className="training-detail-stats">
        <DetailStat icon={<TeamOutlined />} label="Kayıtlı sporcu" value={training.attendanceSummary.totalAthletes} />
        <DetailStat icon={<CheckCircleOutlined />} label="Yoklaması girilen" value={training.attendanceSummary.recordedCount} />
        <DetailStat icon={<ClockCircleOutlined />} label="Süre" value={formatDuration(training.startsAt, training.endsAt)} />
      </div>

      <div className="training-detail-grid">
        <Card title={<Space><CalendarOutlined /> Antrenman bilgileri</Space>}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Tarih">{formatDate(training.startsAt)}</Descriptions.Item>
            <Descriptions.Item label="Saat">{formatTime(training.startsAt)} – {formatTime(training.endsAt)}</Descriptions.Item>
            <Descriptions.Item label="Antrenör">
              <Button type="link" className="training-detail-link" onClick={() => navigate(`/antrenorler/${training.coachId}`)}>{training.coachName}</Button>
            </Descriptions.Item>
            <Descriptions.Item label="Gruplar">
              <Space size={[4, 4]} wrap>
                {training.groups.map((group) => (
                  <Button key={group.id} size="small" onClick={() => navigate(`/gruplar/${group.id}`)}>{group.name}</Button>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Başlatılma">{training.startedAt ? formatDateTime(training.startedAt) : "Henüz başlatılmadı"}</Descriptions.Item>
            <Descriptions.Item label="Tamamlanma">{training.completedAt ? formatDateTime(training.completedAt) : "Henüz tamamlanmadı"}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title={<Space><TeamOutlined /> Yoklama durumu</Space>}>
          <Statistic title="Yoklaması girilen sporcu" value={training.attendanceSummary.recordedCount} suffix={`/ ${training.attendanceSummary.totalAthletes}`} />
          <Progress percent={attendancePercent} showInfo={false} strokeColor="#16a34a" />
          <Typography.Paragraph type="secondary" className="training-attendance-copy">
            {status === "Scheduled"
              ? "Antrenman başlatıldığında yoklama listesi oluşturulur."
              : training.attendanceSummary.recordedCount === training.attendanceSummary.totalAthletes
                ? "Tüm sporcuların yoklaması girildi."
                : `${training.attendanceSummary.totalAthletes - training.attendanceSummary.recordedCount} sporcu için yoklama bekleniyor.`}
          </Typography.Paragraph>
        </Card>
      </div>

      {training.notes && (
        <Card className="training-detail-notes" title="Antrenman notu">
          <Typography.Paragraph className="training-notes-copy">{training.notes}</Typography.Paragraph>
        </Card>
      )}
    </div>
  );
}

function DetailStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card className="training-detail-stat">
      <Space align="start">
        <span className="training-detail-stat-icon">{icon}</span>
        <Statistic title={label} value={value} />
      </Space>
    </Card>
  );
}

function TrainingStatusTag({ status }: { status: TrainingStatus }) {
  const color = status === "Completed" ? "green" : status === "InProgress" ? "blue" : status === "Missed" ? "orange" : "default";
  const label = status === "Completed" ? "Tamamlandı" : status === "InProgress" ? "Devam ediyor" : status === "Missed" ? "Yapılmadı" : "Planlandı";
  return <Tag color={color}>{label}</Tag>;
}

function getTrainingStatus(training: Training, now: Date): TrainingStatus {
  if (training.completedAt) return "Completed";
  if (training.startedAt) return "InProgress";
  return new Date(training.startsAt) < now ? "Missed" : "Scheduled";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDuration(startsAt: string, endsAt: string): string {
  const minutes = Math.max(0, Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours} sa ${remainingMinutes} dk` : `${remainingMinutes} dk`;
}
