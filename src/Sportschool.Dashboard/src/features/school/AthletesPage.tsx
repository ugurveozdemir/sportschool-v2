import { PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography, message } from "antd";
import { useState } from "react";
import { ApiError } from "../../app/api/apiClient";
import { createAthlete, deactivateAthlete, listAthletes, listGroups, type Athlete, type CreateAthleteInput } from "./athletesApi";

export function AthletesPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CreateAthleteInput>();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const athletesQuery = useQuery({ queryKey: ["school", "athletes", search], queryFn: () => listAthletes(search) });
  const groupsQuery = useQuery({ queryKey: ["school", "groups"], queryFn: listGroups });

  const createMutation = useMutation({
    mutationFn: createAthlete,
    onSuccess: () => {
      message.success("Sporcu ve veli hesabı oluşturuldu.");
      setIsCreateOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAthlete,
    onSuccess: () => {
      message.success("Sporcu pasife alındı.");
      void queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Sporcular</Typography.Title>
          <Typography.Paragraph type="secondary">Sporcu ve veli hesaplarını okulunuza ekleyin.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreateOpen(true)}>Sporcu ekle</Button>
      </div>

      <Table<Athlete>
        rowKey="id"
        loading={athletesQuery.isLoading}
        dataSource={athletesQuery.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        title={() => <Input.Search allowClear placeholder="Sporcu veya veli ara" onSearch={setSearch} onChange={(event) => setSearch(event.target.value)} />}
        columns={[
          {
            title: "Sporcu",
            key: "athlete",
            render: (_, athlete) => (
              <Space>
                <Avatar src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
                <Typography.Text strong>{athlete.firstName} {athlete.lastName}</Typography.Text>
              </Space>
            )
          },
          { title: "Doğum tarihi", dataIndex: "birthDate", key: "birthDate", render: (value: string) => formatDate(value) },
          { title: "Veli", dataIndex: "parentFullName", key: "parentFullName" },
          { title: "Telefon", dataIndex: "parentPhone", key: "parentPhone" },
          {
            title: "İşlemler",
            key: "actions",
            render: (_, athlete) => (
              <Popconfirm
                title="Sporcu pasife alınsın mı?"
                description="Sporcu hesabı artık giriş yapamayacak."
                okText="Pasife al"
                cancelText="Vazgeç"
                onConfirm={() => deactivateMutation.mutate(athlete.id)}
              >
                <Button danger size="small" loading={deactivateMutation.isPending}>Pasife al</Button>
              </Popconfirm>
            )
          }
        ]}
      />

      <Modal
        title="Yeni sporcu"
        open={isCreateOpen}
        width={760}
        okText="Sporcu ekle"
        cancelText="Vazgeç"
        confirmLoading={createMutation.isPending}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Typography.Title level={5}>Sporcu bilgileri</Typography.Title>
          <div className="form-grid">
            <Form.Item name="firstName" label="Ad" rules={[{ required: true, message: "Ad zorunludur." }]}><Input autoFocus /></Form.Item>
            <Form.Item name="lastName" label="Soyad" rules={[{ required: true, message: "Soyad zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="birthDate" label="Doğum tarihi" rules={[{ required: true, message: "Doğum tarihi zorunludur." }]}><Input type="date" /></Form.Item>
            <Form.Item name="groupId" label="İlk grup"><Select allowClear loading={groupsQuery.isLoading} options={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))} /></Form.Item>
            <Form.Item name="athleteEmail" label="Sporcu e-postası" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
            <Form.Item name="athletePassword" label="Sporcu ilk şifresi" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}><Input.Password /></Form.Item>
          </div>

          <Typography.Title level={5}>Veli bilgileri</Typography.Title>
          <Typography.Paragraph type="secondary">Veli e-postası kayıtlıysa mevcut veli hesabı kullanılır ve şifresi değiştirilmez.</Typography.Paragraph>
          <div className="form-grid">
            <Form.Item name="parentFullName" label="Veli ad soyad" rules={[{ required: true, message: "Veli adı zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="parentPhone" label="Veli telefonu" rules={[{ required: true, message: "Telefon zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="parentEmail" label="Veli e-postası" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
            <Form.Item name="parentPassword" label="Veli ilk şifresi" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}><Input.Password /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Bu e-posta adresi okulda zaten kullanılıyor.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
