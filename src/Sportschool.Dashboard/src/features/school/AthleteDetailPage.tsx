import {
  ArrowLeftOutlined,
  CalendarOutlined,
  MailOutlined,
  PhoneOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Descriptions, Empty, Result, Skeleton, Space, Tag, Typography } from "antd";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { getAthlete } from "./athletesApi";

export function AthleteDetailPage() {
  const navigate = useNavigate();
  const { athleteId } = useParams();
  const athleteQuery = useQuery({
    enabled: Boolean(athleteId),
    queryKey: ["school", "athletes", athleteId],
    queryFn: () => getAthlete(athleteId!)
  });

  if (athleteQuery.isLoading) {
    return <Card><Skeleton active avatar={{ size: 96 }} paragraph={{ rows: 6 }} /></Card>;
  }

  if (athleteQuery.error instanceof ApiError && athleteQuery.error.status === 404) {
    return (
      <Result
        status="404"
        title="Sporcu bulunamadı"
        subTitle="Sporcu silinmiş, pasife alınmış veya okulunuza ait olmayabilir."
        extra={<Button type="primary" onClick={() => navigate("/sporcular")}>Sporculara dön</Button>}
      />
    );
  }

  if (athleteQuery.isError || !athleteQuery.data) {
    return (
      <Alert
        showIcon
        type="error"
        message="Sporcu bilgileri yüklenemedi."
        description="Lütfen bağlantınızı kontrol edip tekrar deneyin."
        action={<Button onClick={() => void athleteQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const athlete = athleteQuery.data;
  const fullName = `${athlete.firstName} ${athlete.lastName}`;

  return (
    <div>
      <Button className="detail-back-button" icon={<ArrowLeftOutlined />} onClick={() => navigate("/sporcular")}>
        Sporculara dön
      </Button>

      <Card className="athlete-profile-card">
        <div className="athlete-profile-summary">
          <Avatar size={96} src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
          <div>
            <Space wrap>
              <Typography.Title level={2}>{fullName}</Typography.Title>
              <Tag color="green">Aktif sporcu</Tag>
            </Space>
            <Typography.Text type="secondary">
              {formatAge(athlete.birthDate)} yaş · {formatDate(athlete.birthDate)} doğumlu
            </Typography.Text>
          </div>
        </div>
      </Card>

      <div className="athlete-detail-grid">
        <Card title="Sporcu bilgileri">
          <Descriptions column={1}>
            <Descriptions.Item label={<><CalendarOutlined /> Doğum tarihi</>}>{formatDate(athlete.birthDate)}</Descriptions.Item>
            <Descriptions.Item label={<><UserOutlined /> Yaş</>}>{formatAge(athlete.birthDate)}</Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> E-posta</>}>{athlete.email}</Descriptions.Item>
            <Descriptions.Item label="Kayıt tarihi">{formatDateTime(athlete.createdAt)}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Veli bilgileri">
          <Descriptions column={1}>
            <Descriptions.Item label={<><UserOutlined /> Ad soyad</>}>{athlete.parentFullName}</Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined /> Telefon</>}>{athlete.parentPhone}</Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> E-posta</>}>{athlete.parentEmail ?? "—"}</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      <Card className="athlete-groups-card" title={<Space><TeamOutlined /> Gruplar</Space>}>
        {athlete.groups.length > 0
          ? <Space wrap>{athlete.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>
          : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sporcu henüz bir gruba eklenmemiş." />}
      </Card>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(value));
}

function formatAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthday) age--;
  return age;
}
