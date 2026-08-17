import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Empty, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import { ApiError } from "../../app/api/apiClient";
import { createAnnouncement, deactivateAnnouncement, listAnnouncements, updateAnnouncement, type Announcement, type AnnouncementInput } from "./announcementsApi";

type AnnouncementFormValues = { title: string; content: string; expiresOn?: string };

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AnnouncementFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const announcementsQuery = useQuery({ queryKey: ["school", "announcements"], queryFn: listAnnouncements });
  const saveAnnouncement = useMutation({
    mutationFn: (values: AnnouncementFormValues) => {
      const input = toAnnouncementInput(values);
      return editingAnnouncement ? updateAnnouncement(editingAnnouncement.id, input) : createAnnouncement(input);
    },
    onSuccess: () => { message.success(editingAnnouncement ? "Duyuru güncellendi." : "Duyuru yayınlandı."); closeModal(); void queryClient.invalidateQueries({ queryKey: ["school", "announcements"] }); },
    onError: (error) => message.error(errorMessage(error))
  });
  const deactivate = useMutation({
    mutationFn: deactivateAnnouncement,
    onSuccess: () => { message.success("Duyuru yayından kaldırıldı."); void queryClient.invalidateQueries({ queryKey: ["school", "announcements"] }); },
    onError: (error) => message.error(errorMessage(error))
  });

  function openCreate() { setEditingAnnouncement(null); form.resetFields(); setIsModalOpen(true); }
  function openEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    form.setFieldsValue({
      title: announcement.title,
      content: announcement.content,
      expiresOn: announcement.expiresAt && !announcement.isExpired ? toDateInput(announcement.expiresAt) : undefined
    });
    setIsModalOpen(true);
  }
  function closeModal() { setIsModalOpen(false); setEditingAnnouncement(null); form.resetFields(); }

  return <div>
    <div className="page-heading"><div><Typography.Title level={2}>Duyurular</Typography.Title><Typography.Paragraph type="secondary">Veli ve sporculara ulaşacak okul duyurularını yönetin.</Typography.Paragraph></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Duyuru yayınla</Button></div>
    {announcementsQuery.isError && <Alert showIcon type="error" message="Duyurular yüklenemedi." action={<Button size="small" onClick={() => void announcementsQuery.refetch()}>Tekrar dene</Button>} />}
    <Table<Announcement> rowKey="id" loading={announcementsQuery.isLoading} dataSource={announcementsQuery.data ?? []} pagination={{ pageSize: 10, showSizeChanger: false }} locale={{ emptyText: <Empty description="Henüz duyuru yayınlanmadı." /> }} columns={[
      { title: "Duyuru", key: "announcement", render: (_, announcement) => <><Typography.Text strong>{announcement.title}</Typography.Text><br /><Typography.Text type="secondary" ellipsis={{ tooltip: announcement.content }}>{announcement.content}</Typography.Text></> },
      { title: "Yayınlayan", dataIndex: "createdByName", key: "createdByName", render: (name: string | null) => name ?? "—" },
      { title: "Yayın tarihi", dataIndex: "publishedAt", key: "publishedAt", render: formatDateTime },
      { title: "Bitiş", dataIndex: "expiresAt", key: "expiresAt", render: (value: string | null) => value ? formatDate(value) : "Süresiz" },
      { title: "Durum", key: "status", render: (_, announcement) => announcement.isExpired ? <Tag color="default">Süresi doldu</Tag> : announcement.isNew ? <Tag color="green">Yeni</Tag> : <Tag color="blue">Yayında</Tag> },
      { title: "İşlemler", key: "actions", render: (_, announcement) => <Space size="small" wrap><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(announcement)}>Düzenle</Button><Popconfirm title="Bu duyuru yayından kaldırılsın mı?" description="Veli ve sporcular duyuruyu artık göremez." okText="Kaldır" cancelText="Vazgeç" onConfirm={() => deactivate.mutate(announcement.id)}><Button danger size="small" icon={<DeleteOutlined />} loading={deactivate.isPending}>Kaldır</Button></Popconfirm></Space> }
    ]} />
    <Modal title={editingAnnouncement ? "Duyuruyu düzenle" : "Duyuru yayınla"} open={isModalOpen} okText={editingAnnouncement ? "Kaydet" : "Yayınla"} cancelText="Vazgeç" confirmLoading={saveAnnouncement.isPending} onCancel={closeModal} onOk={() => form.submit()}>
      <Form form={form} layout="vertical" onFinish={(values) => saveAnnouncement.mutate(values)}>
        <Form.Item name="title" label="Başlık" rules={[{ required: true, message: "Başlık zorunludur." }, { max: 160, message: "Başlık en fazla 160 karakter olabilir." }]}><Input autoFocus maxLength={160} showCount /></Form.Item>
        <Form.Item name="content" label="Duyuru metni" rules={[{ required: true, message: "Duyuru metni zorunludur." }, { max: 2000, message: "Metin en fazla 2000 karakter olabilir." }]}><Input.TextArea rows={7} maxLength={2000} showCount /></Form.Item>
        <Form.Item
          name="expiresOn"
          label="Yayından kalkış tarihi"
          extra={editingAnnouncement?.isExpired ? "Duyuruyu yeniden yayınlamak için yeni bir tarih seçebilir veya süresiz bırakabilirsiniz." : undefined}
        >
          <Input type="date" />
        </Form.Item>
      </Form>
    </Modal>
  </div>;
}

function toAnnouncementInput(values: AnnouncementFormValues): AnnouncementInput { return { title: values.title, content: values.content, expiresAt: values.expiresOn ? new Date(`${values.expiresOn}T23:59:59`).toISOString() : null }; }
function toDateInput(value: string): string { const date = new Date(value); const pad = (part: number) => part.toString().padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
function errorMessage(error: Error): string { return error instanceof ApiError && error.status === 400 ? "Başlık, metin ve yayından kalkış tarihini kontrol edin." : "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin."; }
