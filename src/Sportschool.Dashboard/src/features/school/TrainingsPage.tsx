import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Dropdown, Empty, Form, Input, Modal, Pagination, Segmented, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { listCoaches } from "./coachesApi";
import { listGroups } from "./groupsApi";
import { createTraining, deactivateTraining, listTrainings, updateTraining, type Training, type TrainingInput } from "./trainingsApi";

type TrainingFormValues = {
  title: string;
  groupIds: string[];
  coachId: string;
  startsAt: string;
  endsAt: string;
  recurrence: "None" | "Weekly";
  recurrenceEndsOn?: string;
  location?: string;
  notes?: string;
};

type TrainingPeriod = "upcoming" | "past";
type TrainingStatus = "Scheduled" | "InProgress" | "Completed" | "Missed";
type TrainingStatusFilter = "all" | TrainingStatus;

const pageSize = 12;
const rangeStart = new Date();
rangeStart.setHours(0, 0, 0, 0);
const rangeEnd = new Date(rangeStart);
rangeEnd.setDate(rangeEnd.getDate() + 90);
const pastRangeStart = new Date(rangeStart);
pastRangeStart.setDate(pastRangeStart.getDate() - 90);

export function TrainingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<TrainingFormValues>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string>();
  const [coachId, setCoachId] = useState<string>();
  const [status, setStatus] = useState<TrainingStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<Training | null>(null);
  const [period, setPeriod] = useState<TrainingPeriod>("upcoming");
  const trainingsQuery = useQuery({
    queryKey: ["school", "trainings", period],
    queryFn: () => period === "upcoming" ? listTrainings(rangeStart, rangeEnd) : listTrainings(pastRangeStart, rangeStart),
    placeholderData: (previousData) => previousData
  });
  const groupsQuery = useQuery({ queryKey: ["school", "groups"], queryFn: () => listGroups() });
  const coachesQuery = useQuery({ queryKey: ["school", "coaches"], queryFn: listCoaches });
  const recurrence = Form.useWatch("recurrence", form);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const saveTraining = useMutation({
    mutationFn: async (values: TrainingFormValues) => {
      const input = toTrainingInput(values);
      if (editingTraining) {
        await updateTraining(editingTraining.id, input);
      } else {
        await createTraining(input);
      }
    },
    onSuccess: () => {
      message.success(editingTraining ? "Antrenman güncellendi." : "Antrenman planlandı.");
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ["school", "trainings"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivate = useMutation({
    mutationFn: deactivateTraining,
    onSuccess: () => {
      message.success("Antrenman iptal edildi.");
      setDeactivationTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["school", "trainings"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  function openCreate() {
    setEditingTraining(null);
    form.resetFields();
    form.setFieldValue("recurrence", "None");
    setIsModalOpen(true);
  }

  function openEdit(training: Training) {
    setEditingTraining(training);
    form.setFieldsValue({
      title: training.title,
      groupIds: training.groups.map((group) => group.id),
      coachId: training.coachId,
      startsAt: toDateTimeLocal(training.startsAt),
      endsAt: toDateTimeLocal(training.endsAt),
      recurrence: "None",
      location: training.location ?? undefined,
      notes: training.notes ?? undefined
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTraining(null);
    form.resetFields();
  }

  function handleAction(action: string, training: Training) {
    if (action === "edit") {
      openEdit(training);
      return;
    }

    setDeactivationTarget(training);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setGroupId(undefined);
    setCoachId(undefined);
    setStatus("all");
    setPage(1);
  }

  if (trainingsQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        message="Antrenmanlar yüklenemedi."
        description="Listeyi yenileyip tekrar deneyin."
        action={<Button onClick={() => void trainingsQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const now = new Date();
  const trainings = period === "past" ? [...(trainingsQuery.data ?? [])].reverse() : trainingsQuery.data ?? [];
  const filteredTrainings = trainings.filter((training) => {
    const normalizedSearch = search.toLocaleLowerCase("tr-TR");
    const matchesSearch = !normalizedSearch
      || training.title.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
      || training.coachName.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
      || training.groups.some((group) => group.name.toLocaleLowerCase("tr-TR").includes(normalizedSearch));
    const matchesGroup = !groupId || training.groups.some((group) => group.id === groupId);
    const matchesCoach = !coachId || training.coachId === coachId;
    const matchesStatus = status === "all" || getTrainingStatus(training, now) === status;

    return matchesSearch && matchesGroup && matchesCoach && matchesStatus;
  });
  const visibleTrainings = filteredTrainings.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(search || groupId || coachId || status !== "all");

  return (
    <div>
      <div className="page-heading training-page-heading">
        <div>
          <Typography.Title level={2}>Antrenmanlar</Typography.Title>
          <Typography.Paragraph type="secondary">
            {period === "upcoming" ? "Önümüzdeki 90 günün antrenman programını yönetin." : "Son 90 günün antrenman kayıtlarını gözden geçirin."}
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Antrenman planla</Button>
      </div>

      <Card className="training-roster-card">
        <div className="training-roster-toolbar">
          <Input.Search
            allowClear
            value={searchInput}
            placeholder="Antrenman, grup veya antrenör ara"
            aria-label="Antrenman, grup veya antrenör ara"
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => {
              setSearchInput(value);
              setSearch(value.trim());
              setPage(1);
            }}
            onClear={() => {
              setSearchInput("");
              setSearch("");
            }}
          />
          <Select
            allowClear
            value={groupId}
            placeholder="Tüm gruplar"
            aria-label="Gruba göre filtrele"
            loading={groupsQuery.isLoading}
            options={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))}
            onChange={(value) => {
              setGroupId(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={coachId}
            placeholder="Tüm antrenörler"
            aria-label="Antrenöre göre filtrele"
            loading={coachesQuery.isLoading}
            options={(coachesQuery.data ?? []).map((coach) => ({ value: coach.id, label: coach.fullName }))}
            onChange={(value) => {
              setCoachId(value);
              setPage(1);
            }}
          />
          <Select<TrainingStatusFilter>
            value={status}
            aria-label="Duruma göre filtrele"
            options={[
              { value: "all", label: "Tüm durumlar" },
              { value: "Scheduled", label: "Planlandı" },
              { value: "InProgress", label: "Devam ediyor" },
              { value: "Completed", label: "Tamamlandı" },
              { value: "Missed", label: "Yapılmadı" }
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>

        <div className="training-roster-summary" aria-live="polite">
          <Typography.Text type="secondary">
            {hasFilters ? `${filteredTrainings.length} antrenman bulundu` : `${filteredTrainings.length} antrenman`}
          </Typography.Text>
          {hasFilters && <Button type="link" onClick={clearFilters}>Filtreleri temizle</Button>}
        </div>

        <Segmented<TrainingPeriod>
          className="training-period-selector"
          value={period}
          options={[
            { label: "Yaklaşan", value: "upcoming" },
            { label: "Geçmiş (90 gün)", value: "past" }
          ]}
          onChange={(value) => {
            setPeriod(value);
            setPage(1);
          }}
        />

        {trainingsQuery.isLoading && !trainingsQuery.data
          ? <Card loading bordered={false} />
          : filteredTrainings.length === 0
            ? <Empty className="training-roster-empty" description={emptyDescription(period, hasFilters)} />
            : (
              <>
                <div className="training-roster-table">
                  <Table<Training>
                    rowKey="id"
                    loading={trainingsQuery.isFetching}
                    dataSource={visibleTrainings}
                    pagination={false}
                    onRow={(training) => ({
                      className: "training-roster-row",
                      onClick: () => navigate(`/antrenmanlar/${training.id}`)
                    })}
                    columns={[
                      { title: "Tarih", key: "date", render: (_, training) => <TrainingDate training={training} /> },
                      { title: "Antrenman", key: "training", render: (_, training) => <TrainingTitle training={training} /> },
                      { title: "Gruplar", key: "groups", render: (_, training) => <TrainingGroups training={training} /> },
                      { title: "Antrenör", dataIndex: "coachName", key: "coachName" },
                      { title: "Durum", key: "status", render: (_, training) => <TrainingStatusTag training={training} now={now} /> },
                      { title: "Yoklama", key: "attendance", render: (_, training) => <AttendanceSummary training={training} /> },
                      {
                        title: "İşlemler",
                        key: "actions",
                        align: "right",
                        render: (_, training) => <span onClick={(event) => event.stopPropagation()}><TrainingActions training={training} now={now} onAction={handleAction} /></span>
                      }
                    ]}
                  />
                </div>

                <div className="training-roster-cards">
                  {visibleTrainings.map((training) => (
                    <Card
                      key={training.id}
                      className="training-roster-item training-roster-item-clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/antrenmanlar/${training.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/antrenmanlar/${training.id}`);
                        }
                      }}
                    >
                      <div className="training-roster-item-heading">
                        <TrainingTitle training={training} />
                        <span onClick={(event) => event.stopPropagation()}><TrainingActions training={training} now={now} onAction={handleAction} /></span>
                      </div>
                      <div className="training-roster-item-details">
                        <div><Typography.Text type="secondary">Tarih</Typography.Text><TrainingDate training={training} /></div>
                        <div><Typography.Text type="secondary">Durum</Typography.Text><TrainingStatusTag training={training} now={now} /></div>
                        <div><Typography.Text type="secondary">Gruplar</Typography.Text><TrainingGroups training={training} /></div>
                        <div><Typography.Text type="secondary">Antrenör</Typography.Text><Typography.Text>{training.coachName}</Typography.Text></div>
                        <div><Typography.Text type="secondary">Yoklama</Typography.Text><AttendanceSummary training={training} /></div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Pagination
                  className="training-roster-pagination"
                  current={page}
                  pageSize={pageSize}
                  total={filteredTrainings.length}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total} antrenman`}
                  onChange={setPage}
                />
              </>
            )}
      </Card>

      <Modal
        title="Antrenman iptal edilsin mi?"
        open={deactivationTarget !== null}
        okText="İptal et"
        cancelText="Vazgeç"
        okButtonProps={{ danger: true }}
        confirmLoading={deactivate.isPending}
        onCancel={() => setDeactivationTarget(null)}
        onOk={() => {
          if (deactivationTarget) deactivate.mutate(deactivationTarget.id);
        }}
      >
        <Typography.Paragraph>
          <Typography.Text strong>{deactivationTarget?.title}</Typography.Text>{" "}
          {deactivationTarget && `· ${formatDateTime(deactivationTarget.startsAt)} ${formatTime(deactivationTarget.startsAt)}`}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">Yoklama kaydı korunur, antrenman listelerden kaldırılır.</Typography.Paragraph>
      </Modal>

      <Modal
        title={editingTraining ? "Antrenmanı düzenle" : "Antrenman planla"}
        open={isModalOpen}
        width={680}
        okText={editingTraining ? "Kaydet" : "Planla"}
        cancelText="Vazgeç"
        confirmLoading={saveTraining.isPending}
        onCancel={closeModal}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveTraining.mutate(values)}>
          <Form.Item name="title" label="Antrenman adı" rules={[{ required: true, message: "Antrenman adı zorunludur." }]}><Input autoFocus placeholder="Örn. Teknik gelişim antrenmanı" /></Form.Item>
          <div className="training-form-grid">
            <Form.Item name="groupIds" label="Gruplar" rules={[{ required: true, message: "En az bir grup seçin." }]}>
              <Select mode="multiple" placeholder="Grupları seçin" loading={groupsQuery.isLoading} options={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))} />
            </Form.Item>
            <Form.Item name="coachId" label="Antrenör" rules={[{ required: true, message: "Antrenör seçin." }]}>
              <Select placeholder="Antrenör seçin" loading={coachesQuery.isLoading} options={(coachesQuery.data ?? []).map((coach) => ({ value: coach.id, label: coach.fullName }))} />
            </Form.Item>
          </div>
          <div className="training-form-grid">
            <Form.Item name="startsAt" label="Başlangıç" rules={[{ required: true, message: "Başlangıç zamanı zorunludur." }]}><Input type="datetime-local" /></Form.Item>
            <Form.Item name="endsAt" label="Bitiş" rules={[{ required: true, message: "Bitiş zamanı zorunludur." }]}><Input type="datetime-local" /></Form.Item>
          </div>
          {!editingTraining && <div className="training-form-grid">
            <Form.Item name="recurrence" label="Tekrar"><Select options={[{ value: "None", label: "Tek sefer" }, { value: "Weekly", label: "Her hafta" }]} /></Form.Item>
            {recurrence === "Weekly" && <Form.Item name="recurrenceEndsOn" label="Tekrar bitişi" rules={[{ required: true, message: "Tekrar bitiş tarihi zorunludur." }]}><Input type="date" /></Form.Item>}
          </div>}
          <Form.Item name="location" label="Konum"><Input placeholder="Örn. Ana saha" /></Form.Item>
          <Form.Item name="notes" label="Not"><Input.TextArea rows={3} placeholder="Antrenör için not" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function TrainingDate({ training }: { training: Training }) {
  return (
    <span className="training-date-copy">
      <Typography.Text>{formatDateTime(training.startsAt)}</Typography.Text>
      <Typography.Text type="secondary">{formatTime(training.startsAt)} – {formatTime(training.endsAt)}</Typography.Text>
    </span>
  );
}

function TrainingTitle({ training }: { training: Training }) {
  return (
    <span className="training-title-copy">
      <Typography.Text strong>{training.title}</Typography.Text>
      {training.location && <Typography.Text type="secondary">{training.location}</Typography.Text>}
    </span>
  );
}

function TrainingGroups({ training }: { training: Training }) {
  return <Space className="training-group-list" size={[4, 4]} wrap>{training.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>;
}

function AttendanceSummary({ training }: { training: Training }) {
  return <Typography.Text>{training.attendanceSummary.recordedCount}/{training.attendanceSummary.totalAthletes} girildi</Typography.Text>;
}

function TrainingStatusTag({ training, now }: { training: Training; now: Date }) {
  const status = getTrainingStatus(training, now);
  return <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>;
}

function TrainingActions({ training, now, onAction }: { training: Training; now: Date; onAction: (action: string, training: Training) => void }) {
  if (!canManageTraining(training, now)) {
    return <Typography.Text type="secondary">İşlem yok</Typography.Text>;
  }

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "edit", label: "Düzenle" },
          { type: "divider" },
          { key: "deactivate", danger: true, label: "İptal et" }
        ],
        onClick: ({ key }) => onAction(key, training)
      }}
    >
      <Button type="text" icon={<MoreOutlined />} aria-label={`${training.title} işlemleri`} />
    </Dropdown>
  );
}

function getTrainingStatus(training: Training, now: Date): TrainingStatus {
  if (training.completedAt) return "Completed";
  if (training.startedAt) return "InProgress";
  return new Date(training.startsAt) < now ? "Missed" : "Scheduled";
}

function canManageTraining(training: Training, now: Date): boolean {
  return getTrainingStatus(training, now) === "Scheduled";
}

function statusLabel(status: TrainingStatus): string {
  return status === "Completed" ? "Tamamlandı" : status === "InProgress" ? "Devam ediyor" : status === "Missed" ? "Yapılmadı" : "Planlandı";
}

function statusColor(status: TrainingStatus): string {
  return status === "Completed" ? "green" : status === "InProgress" ? "blue" : status === "Missed" ? "orange" : "default";
}

function emptyDescription(period: TrainingPeriod, hasFilters: boolean): string {
  if (hasFilters) return "Bu filtrelerle eşleşen antrenman bulunamadı.";
  return period === "upcoming" ? "Yaklaşan antrenman bulunmuyor." : "Son 90 günde antrenman bulunmuyor.";
}

function toTrainingInput(values: TrainingFormValues): TrainingInput {
  return {
    groupIds: values.groupIds,
    title: values.title,
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
    recurrence: values.recurrence,
    recurrenceEndsOn: values.recurrence === "Weekly" ? values.recurrenceEndsOn ?? null : null,
    location: values.location?.trim() || null,
    notes: values.notes?.trim() || null,
    coachId: values.coachId
  };
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  const pad = (part: number) => part.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "long" }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 404) return "Seçilen grup veya antrenör artık aktif değil.";
  if (error instanceof ApiError && error.status === 409) return "Bu antrenman başladı veya zamanı geçtiği için değiştirilemez.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
