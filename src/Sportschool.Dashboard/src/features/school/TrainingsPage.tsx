import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Form, Input, Modal, Popconfirm, Segmented, Select, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
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

const rangeStart = new Date();
rangeStart.setHours(0, 0, 0, 0);
const rangeEnd = new Date(rangeStart);
rangeEnd.setDate(rangeEnd.getDate() + 90);
const pastRangeStart = new Date(rangeStart);
pastRangeStart.setDate(pastRangeStart.getDate() - 90);

type TrainingPeriod = "upcoming" | "past";

export function TrainingsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<TrainingFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [period, setPeriod] = useState<TrainingPeriod>("upcoming");
  const trainingsQuery = useQuery({
    queryKey: ["school", "trainings", period],
    queryFn: () => period === "upcoming" ? listTrainings(rangeStart, rangeEnd) : listTrainings(pastRangeStart, rangeStart)
  });
  const groupsQuery = useQuery({ queryKey: ["school", "groups"], queryFn: listGroups });
  const coachesQuery = useQuery({ queryKey: ["school", "coaches"], queryFn: listCoaches });
  const recurrence = Form.useWatch("recurrence", form);

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
      location: training.location ?? undefined
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingTraining(null);
    form.resetFields();
  }

  const trainings = period === "past" ? [...(trainingsQuery.data ?? [])].reverse() : trainingsQuery.data ?? [];

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Antrenmanlar</Typography.Title>
          <Typography.Paragraph type="secondary">
            {period === "upcoming" ? "Önümüzdeki 90 günün antrenman programını yönetin." : "Son 90 günün tamamlanan antrenmanlarını görüntüleyin."}
          </Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Antrenman planla</Button>
      </div>

      <Segmented<TrainingPeriod>
        className="training-period-selector"
        value={period}
        options={[
          { label: "Yaklaşan", value: "upcoming" },
          { label: "Geçmiş (90 gün)", value: "past" }
        ]}
        onChange={setPeriod}
      />

      <Table<Training>
        rowKey="id"
        loading={trainingsQuery.isLoading}
        dataSource={trainings}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        locale={{ emptyText: <Empty description={period === "upcoming" ? "Yaklaşan antrenman bulunmuyor." : "Son 90 günde antrenman bulunmuyor."} /> }}
        columns={[
          { title: "Tarih", key: "date", render: (_, training) => <>{formatDateTime(training.startsAt)}<br /><Typography.Text type="secondary">{formatTime(training.startsAt)} – {formatTime(training.endsAt)}</Typography.Text></> },
          { title: "Antrenman", dataIndex: "title", key: "title", render: (title: string, training) => <><Typography.Text strong>{title}</Typography.Text>{training.location && <><br /><Typography.Text type="secondary">{training.location}</Typography.Text></>}</> },
          { title: "Gruplar", key: "groups", render: (_, training) => <Space size={[0, 4]} wrap>{training.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space> },
          { title: "Antrenör", dataIndex: "coachName", key: "coachName" },
          { title: "Yoklama", key: "attendance", render: (_, training) => `${training.attendanceSummary.recordedCount}/${training.attendanceSummary.totalAthletes}` },
          {
            title: "İşlemler",
            key: "actions",
            render: (_, training) => (
              <Space size="small" wrap>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(training)}>Düzenle</Button>
                <Popconfirm title="Bu antrenman iptal edilsin mi?" description="Yoklama kaydı korunur, antrenman listelerden kaldırılır." okText="İptal et" cancelText="Vazgeç" onConfirm={() => deactivate.mutate(training.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />} loading={deactivate.isPending}>İptal et</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

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
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
