import { CopyOutlined, PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Popconfirm, Space, Table, Typography, message } from "antd";
import { useState } from "react";
import { ApiError } from "../../app/api/apiClient";
import { createCoach, deactivateCoach, listCoaches, type Coach, type CreatedCoach } from "./coachesApi";

type CoachFormValues = {
  fullName: string;
  email: string;
};

export function CoachesPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CoachFormValues>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCoach, setCreatedCoach] = useState<CreatedCoach | null>(null);
  const coachesQuery = useQuery({ queryKey: ["school", "coaches"], queryFn: listCoaches });

  const createMutation = useMutation({
    mutationFn: createCoach,
    onSuccess: (coach) => {
      setIsCreateOpen(false);
      form.resetFields();
      setCreatedCoach(coach);
      void queryClient.invalidateQueries({ queryKey: ["school", "coaches"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCoach,
    onSuccess: () => {
      message.success("Antrenör pasife alındı.");
      void queryClient.invalidateQueries({ queryKey: ["school", "coaches"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  async function copyPassword() {
    if (!createdCoach?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(createdCoach.temporaryPassword);
      message.success("Geçici şifre kopyalandı.");
    } catch {
      message.error("Şifre kopyalanamadı. Lütfen elle kopyalayın.");
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Antrenörler</Typography.Title>
          <Typography.Paragraph type="secondary">Antrenör hesaplarını yönetin ve mobil uygulama erişimlerini oluşturun.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>Antrenör ekle</Button>
      </div>

      <Table<Coach>
        rowKey="id"
        loading={coachesQuery.isLoading}
        dataSource={coachesQuery.data ?? []}
        pagination={false}
        columns={[
          { title: "Ad soyad", dataIndex: "fullName", key: "fullName" },
          { title: "E-posta", dataIndex: "email", key: "email" },
          {
            title: "İşlemler",
            key: "actions",
            render: (_, coach) => !coach.roles.includes("SchoolAdmin") && (
              <Popconfirm title="Bu antrenör pasife alınsın mı?" description="Antrenör mobil uygulamaya giriş yapamayacak." okText="Pasife al" cancelText="Vazgeç" onConfirm={() => deactivateMutation.mutate(coach.id)}>
                <Button danger size="small" loading={deactivateMutation.isPending}>Pasife al</Button>
              </Popconfirm>
            )
          }
        ]}
      />

      <Modal title="Yeni antrenör" open={isCreateOpen} okText="Antrenör ekle" cancelText="Vazgeç" confirmLoading={createMutation.isPending} onCancel={() => setIsCreateOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="fullName" label="Ad soyad" rules={[{ required: true, message: "Ad soyad zorunludur." }]}><Input autoFocus /></Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Antrenör hesabı hazır" open={createdCoach !== null} footer={<Button type="primary" onClick={() => setCreatedCoach(null)}>Tamam</Button>} closable={false}>
        {createdCoach?.temporaryPassword ? (
          <>
            <Typography.Paragraph><Typography.Text strong>{createdCoach.fullName}</Typography.Text> için geçici şifre oluşturuldu. Bu şifre yalnızca şimdi görüntülenir.</Typography.Paragraph>
            <Space.Compact className="temporary-password-control">
              <Input readOnly value={createdCoach.temporaryPassword} />
              <Button icon={<CopyOutlined />} onClick={() => void copyPassword()}>Kopyala</Button>
            </Space.Compact>
          </>
        ) : (
          <Typography.Paragraph><Typography.Text strong>{createdCoach?.fullName}</Typography.Text> mevcut bir kullanıcıydı; Coach rolü hesabına eklendi.</Typography.Paragraph>
        )}
      </Modal>
    </div>
  );
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Bu e-posta zaten okulda kayıtlı veya pasif durumda.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
