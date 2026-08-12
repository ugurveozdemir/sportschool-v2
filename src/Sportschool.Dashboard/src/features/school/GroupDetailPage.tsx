import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  UserOutlined
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Checkbox, Empty, Result, Skeleton, Space, Statistic, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { listAthletes } from "./athletesApi";
import {
  addAthleteToGroup,
  getGroup,
  listGroupAthletes,
  removeAthleteFromGroup,
  type GroupAthlete,
  type GroupTraining
} from "./groupsApi";

export function GroupDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { groupId } = useParams();
  const [isRosterEditing, setIsRosterEditing] = useState(false);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[] | null>(null);
  const groupQuery = useQuery({
    enabled: Boolean(groupId),
    queryKey: ["school", "groups", groupId],
    queryFn: () => getGroup(groupId!)
  });
  const groupAthletesQuery = useQuery({
    enabled: Boolean(groupId) && isRosterEditing,
    queryKey: ["school", "groups", groupId, "athletes"],
    queryFn: () => listGroupAthletes(groupId!)
  });
  const athletesQuery = useQuery({
    enabled: Boolean(groupId) && isRosterEditing,
    queryKey: ["school", "athletes", "all"],
    queryFn: () => listAthletes("")
  });
  const currentAthletes = groupAthletesQuery.data ?? groupQuery.data?.athletes ?? [];
  const rosterAthleteIds = selectedAthleteIds ?? currentAthletes.map((athlete) => athlete.id);
  const updateRoster = useMutation({
    mutationFn: async () => {
      const memberIds = new Set(currentAthletes.map((athlete) => athlete.id));
      const selectedIds = new Set(rosterAthleteIds);
      const athletesToAdd = rosterAthleteIds.filter((athleteId) => !memberIds.has(athleteId));
      const athletesToRemove = [...memberIds].filter((athleteId) => !selectedIds.has(athleteId));

      await Promise.all([
        ...athletesToAdd.map((athleteId) => addAthleteToGroup(groupId!, athleteId)),
        ...athletesToRemove.map((athleteId) => removeAthleteFromGroup(groupId!, athleteId))
      ]);
    },
    onSuccess: () => {
      message.success("Grup kadrosu güncellendi.");
      setSelectedAthleteIds(null);
      setIsRosterEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["school", "groups", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["school", "groups", groupId, "athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "groups"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  if (groupQuery.isLoading) {
    return <Card><Skeleton active avatar={{ size: 72 }} paragraph={{ rows: 8 }} /></Card>;
  }

  if (groupQuery.error instanceof ApiError && groupQuery.error.status === 404) {
    return (
      <Result
        status="404"
        title="Grup bulunamadı"
        subTitle="Grup pasife alınmış veya okulunuza ait olmayabilir."
        extra={<Button type="primary" onClick={() => navigate("/gruplar")}>Gruplara dön</Button>}
      />
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <Alert
        showIcon
        type="error"
        message="Grup bilgileri yüklenemedi."
        description="Lütfen bağlantınızı kontrol edip tekrar deneyin."
        action={<Button onClick={() => void groupQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const group = groupQuery.data;

  function openRosterEditor() {
    setSelectedAthleteIds(null);
    setIsRosterEditing(true);
  }

  function closeRosterEditor() {
    setSelectedAthleteIds(null);
    setIsRosterEditing(false);
  }

  return (
    <div>
      <Button className="detail-back-button" icon={<ArrowLeftOutlined />} onClick={() => navigate("/gruplar")}>
        Gruplara dön
      </Button>

      <Card className="group-profile-card">
        <div className="group-profile-summary">
          <div>
            <Space wrap>
              <Typography.Title level={2}>{group.name}</Typography.Title>
              <Tag color="green">Aktif grup</Tag>
            </Space>
            <Typography.Paragraph type="secondary">{group.description ?? "Bu grup için açıklama eklenmemiş."}</Typography.Paragraph>
            <Typography.Text type="secondary">Oluşturulma: {formatDate(group.createdAt)}</Typography.Text>
          </div>
          <Space wrap>
            <Button icon={<CalendarOutlined />} onClick={() => navigate("/antrenmanlar")}>Antrenman planla</Button>
            <Button type="primary" icon={<TeamOutlined />} onClick={isRosterEditing ? closeRosterEditor : openRosterEditor}>
              {isRosterEditing ? "Kadro görünümüne dön" : "Kadroyu düzenle"}
            </Button>
          </Space>
        </div>
      </Card>

      <div className="group-stats-grid">
        <GroupStatCard icon={<TeamOutlined />} label="Aktif sporcu" value={group.athleteCount} />
        <GroupStatCard icon={<CalendarOutlined />} label="Yaklaşan antrenman" value={group.upcomingTrainingCount} />
        <GroupStatCard icon={<CheckCircleOutlined />} label="Tamamlanan antrenman" value={group.completedTrainingCount} />
      </div>

      {isRosterEditing && (
        <Card className="group-detail-roster-editor" title={`${group.name} kadrosu`}>
          <Typography.Paragraph type="secondary">Gruba dahil olacak sporcuları seçin.</Typography.Paragraph>
          {athletesQuery.isLoading || groupAthletesQuery.isLoading
            ? <Typography.Paragraph className="group-roster-loading">Sporcular yükleniyor...</Typography.Paragraph>
            : (athletesQuery.data ?? []).length > 0
              ? (
                <Checkbox.Group value={rosterAthleteIds} onChange={(values) => setSelectedAthleteIds(values.filter((value): value is string => typeof value === "string"))}>
                  <div className="athlete-checkbox-grid">
                    {(athletesQuery.data ?? []).map((athlete) => (
                      <Checkbox key={athlete.id} className="athlete-checkbox" value={athlete.id} disabled={updateRoster.isPending}>
                        <Avatar size="small" src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
                        <span>
                          <Typography.Text strong>{athlete.firstName} {athlete.lastName}</Typography.Text>
                          <Typography.Text type="secondary">{athlete.parentFullName}</Typography.Text>
                        </span>
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              )
              : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Seçilebilecek sporcu bulunmuyor." />}
          <Space>
            <Button type="primary" loading={updateRoster.isPending} disabled={athletesQuery.isLoading || groupAthletesQuery.isLoading} onClick={() => updateRoster.mutate()}>Kaydet</Button>
            <Button disabled={updateRoster.isPending} onClick={closeRosterEditor}>Vazgeç</Button>
          </Space>
        </Card>
      )}

      <div className="group-detail-grid">
        <Card className="group-members-card" title={<Space><TeamOutlined /> Sporcu kadrosu ({group.athleteCount})</Space>} extra={<Button size="small" onClick={isRosterEditing ? closeRosterEditor : openRosterEditor}>{isRosterEditing ? "Kapat" : "Düzenle"}</Button>}>
          <AthleteList athletes={group.athletes} />
        </Card>
        <Card className="group-upcoming-card" title={<Space><CalendarOutlined /> Yaklaşan antrenmanlar</Space>} extra={<Button size="small" onClick={() => navigate("/antrenmanlar")}>Tümünü gör</Button>}>
          <TrainingList trainings={group.upcomingTrainings} emptyDescription="Planlanmış yaklaşan antrenman yok." />
        </Card>
      </div>

      <Card className="group-history-card" title={<Space><ClockCircleOutlined /> Son antrenmanlar</Space>}>
        <TrainingList trainings={group.recentTrainings} emptyDescription="Henüz başlamış veya tamamlanmış antrenman yok." />
      </Card>
    </div>
  );
}

function GroupStatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="group-stat-card">
      <Space align="start">
        <span className="group-stat-icon">{icon}</span>
        <Statistic title={label} value={value} />
      </Space>
    </Card>
  );
}

function AthleteList({ athletes }: { athletes: GroupAthlete[] }) {
  if (athletes.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu grupta henüz sporcu yok." />;
  }

  return (
    <>
      <div className="group-members-table">
        <Table<GroupAthlete>
          rowKey="id"
          dataSource={athletes}
          pagination={false}
          columns={[
            { title: "Sporcu", key: "athlete", render: (_, athlete) => <AthleteIdentity athlete={athlete} /> },
            { title: "Veli", dataIndex: "parentFullName", key: "parent" }
          ]}
        />
      </div>
      <div className="group-members-cards">
        {athletes.map((athlete) => (
          <Card key={athlete.id} size="small" className="group-member-card">
            <AthleteIdentity athlete={athlete} />
            <Typography.Text type="secondary">Veli: {athlete.parentFullName}</Typography.Text>
          </Card>
        ))}
      </div>
    </>
  );
}

function AthleteIdentity({ athlete }: { athlete: GroupAthlete }) {
  return (
    <span className="group-athlete-identity">
      <Avatar src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
      <Typography.Text strong>{athlete.firstName} {athlete.lastName}</Typography.Text>
    </span>
  );
}

function TrainingList({ trainings, emptyDescription }: { trainings: GroupTraining[]; emptyDescription: string }) {
  if (trainings.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
  }

  return (
    <div className="group-training-list">
      {trainings.map((training) => (
        <div key={training.id} className="group-training-item">
          <div className="group-training-item-heading">
            <Typography.Text strong>{training.title}</Typography.Text>
            <TrainingStatus training={training} />
          </div>
          <Typography.Text type="secondary">{formatDateTime(training.startsAt)} · {formatTime(training.startsAt)} – {formatTime(training.endsAt)}</Typography.Text>
          <Typography.Text type="secondary">Antrenör: {training.coachName}{training.location ? ` · ${training.location}` : ""}</Typography.Text>
        </div>
      ))}
    </div>
  );
}

function TrainingStatus({ training }: { training: GroupTraining }) {
  if (training.completedAt) return <Tag color="green">Tamamlandı</Tag>;
  if (training.startedAt) return <Tag color="blue">Devam ediyor</Tag>;
  return <Tag>Planlandı</Tag>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "long" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Sporcu bu grupta zaten kayıtlı.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
