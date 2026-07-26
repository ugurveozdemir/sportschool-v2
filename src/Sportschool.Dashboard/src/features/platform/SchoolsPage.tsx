import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Form, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import {
  createSchool,
  createSchoolAdmin,
  deactivateSchool,
  listSchoolAdmins,
  listSchools,
  removeSchoolAdmin,
  updateSchool,
  updateSchoolAdminPassword,
  type School,
  type SchoolAdmin
} from "./platformApi";

type SchoolFormValues = { name: string; code: string };
type AdminFormValues = { fullName: string; email: string; password: string };
type PasswordFormValues = { password: string };

export function SchoolsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<SchoolAdmin | null>(null);
  const [schoolForm] = Form.useForm<SchoolFormValues>();
  const [adminForm] = Form.useForm<AdminFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const schoolsQuery = useQuery({ queryKey: ["platform", "schools", search], queryFn: () => listSchools(search) });
  const adminsQuery = useQuery({
    enabled: selectedSchool !== null,
    queryKey: ["platform", "schools", selectedSchool?.id, "admins"],
    queryFn: () => listSchoolAdmins(selectedSchool!.id)
  });

  const invalidateSchools = () => queryClient.invalidateQueries({ queryKey: ["platform", "schools"] });
  const invalidateAdmins = () => queryClient.invalidateQueries({ queryKey: ["platform", "schools", selectedSchool?.id, "admins"] });

  const saveSchool = useMutation({
    mutationFn: (values: SchoolFormValues) => editingSchool
      ? updateSchool(editingSchool.id, { name: values.name })
      : createSchool(values),
    onSuccess: () => {
      message.success(editingSchool ? "Okul güncellendi." : "Okul oluşturuldu.");
      setIsSchoolModalOpen(false);
      setEditingSchool(null);
      schoolForm.resetFields();
      void invalidateSchools();
    }
  });

  const deactivate = useMutation({
    mutationFn: deactivateSchool,
    onSuccess: () => {
      message.success("Okul pasife alındı.");
      void invalidateSchools();
    }
  });

  const addAdmin = useMutation({
    mutationFn: (values: AdminFormValues) => createSchoolAdmin(selectedSchool!.id, values),
    onSuccess: () => {
      message.success("Okul yöneticisi eklendi.");
      adminForm.resetFields();
      void invalidateAdmins();
    }
  });

  const changePassword = useMutation({
    mutationFn: (values: PasswordFormValues) => updateSchoolAdminPassword(selectedSchool!.id, passwordTarget!.id, values.password),
    onSuccess: () => {
      message.success("Şifre güncellendi.");
      setPasswordTarget(null);
      passwordForm.resetFields();
    }
  });

  const removeAdmin = useMutation({
    mutationFn: (adminId: string) => removeSchoolAdmin(selectedSchool!.id, adminId),
    onSuccess: () => {
      message.success("Okul yöneticisi kaldırıldı.");
      void invalidateAdmins();
    }
  });

  const schoolColumns = [
    { title: "Okul", dataIndex: "name", key: "name" },
    { title: "Kod", dataIndex: "code", key: "code" },
    {
      title: "Durum",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => <Tag color={isActive ? "green" : "default"}>{isActive ? "Aktif" : "Pasif"}</Tag>
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_: unknown, school: School) => (
        <Space size="small" wrap>
          <Button size="small" icon={<TeamOutlined />} onClick={() => setSelectedSchool(school)}>Yöneticiler</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditSchool(school)}>Düzenle</Button>
          {school.isActive && (
            <Popconfirm
              title="Bu okul pasife alınsın mı?"
              description="Okul kullanıcıları artık giriş yapamayacak."
              okText="Pasife al"
              cancelText="Vazgeç"
              onConfirm={() => deactivate.mutate(school.id)}
            >
              <Button danger size="small" loading={deactivate.isPending}>Pasife al</Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  function openCreateSchool() {
    setEditingSchool(null);
    schoolForm.resetFields();
    setIsSchoolModalOpen(true);
  }

  function openEditSchool(school: School) {
    setEditingSchool(school);
    schoolForm.setFieldsValue({ name: school.name, code: school.code });
    setIsSchoolModalOpen(true);
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Okullar</Typography.Title>
          <Typography.Paragraph type="secondary">Okulları ve okul yöneticilerini yönetin.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateSchool}>Okul ekle</Button>
      </div>

      <Table
        rowKey="id"
        loading={schoolsQuery.isLoading}
        dataSource={schoolsQuery.data ?? []}
        columns={schoolColumns}
        pagination={false}
        title={() => <Input.Search allowClear placeholder="Okul adı veya kodu ara" onSearch={setSearch} onChange={(event) => setSearch(event.target.value)} />}
      />

      <Modal
        title={editingSchool ? "Okulu düzenle" : "Yeni okul"}
        open={isSchoolModalOpen}
        okText={editingSchool ? "Kaydet" : "Oluştur"}
        cancelText="Vazgeç"
        confirmLoading={saveSchool.isPending}
        onCancel={() => setIsSchoolModalOpen(false)}
        onOk={() => schoolForm.submit()}
      >
        <Form form={schoolForm} layout="vertical" onFinish={(values) => saveSchool.mutate(values)}>
          <Form.Item name="name" label="Okul adı" rules={[{ required: true, message: "Okul adı zorunludur." }]}>
            <Input autoFocus />
          </Form.Item>
          {!editingSchool && (
            <Form.Item name="code" label="Okul kodu" rules={[{ required: true, message: "Okul kodu zorunludur." }]}>
              <Input placeholder="ornek-akademi" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Drawer title={selectedSchool ? `${selectedSchool.name} yöneticileri` : "Yöneticiler"} open={selectedSchool !== null} width={560} onClose={() => setSelectedSchool(null)}>
        <Form form={adminForm} layout="vertical" onFinish={(values) => addAdmin.mutate(values)}>
          <Typography.Title level={5}>Yeni yönetici</Typography.Title>
          <Form.Item name="fullName" label="Ad soyad" rules={[{ required: true, message: "Ad soyad zorunludur." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="İlk şifre" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={addAdmin.isPending}>Yönetici ekle</Button>
        </Form>

        <Table
          className="admin-table"
          rowKey="id"
          size="small"
          loading={adminsQuery.isLoading}
          dataSource={adminsQuery.data ?? []}
          pagination={false}
          columns={[
            { title: "Ad soyad", dataIndex: "fullName", key: "fullName" },
            { title: "E-posta", dataIndex: "email", key: "email" },
            {
              title: "İşlemler",
              key: "actions",
              render: (_: unknown, admin: SchoolAdmin) => (
                <Space size="small">
                  <Button size="small" icon={<LockOutlined />} onClick={() => setPasswordTarget(admin)}>Şifre</Button>
                  <Popconfirm title="Bu yönetici kaldırılsın mı?" okText="Kaldır" cancelText="Vazgeç" onConfirm={() => removeAdmin.mutate(admin.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} loading={removeAdmin.isPending}>Kaldır</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Drawer>

      <Modal
        title={passwordTarget ? `${passwordTarget.fullName} şifresi` : "Şifre değiştir"}
        open={passwordTarget !== null}
        okText="Kaydet"
        cancelText="Vazgeç"
        confirmLoading={changePassword.isPending}
        onCancel={() => setPasswordTarget(null)}
        onOk={() => passwordForm.submit()}
      >
        <Form form={passwordForm} layout="vertical" onFinish={(values) => changePassword.mutate(values)}>
          <Form.Item name="password" label="Yeni şifre" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}>
            <Input.Password autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
