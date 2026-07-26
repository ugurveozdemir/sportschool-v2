import { DeleteOutlined, EditOutlined, PlusOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Drawer, Empty, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography, message } from "antd";
import { useState } from "react";
import { ApiError } from "../../app/api/apiClient";
import { listAthletes } from "./athletesApi";
import {
  addAthleteToGroup,
  createGroup,
  deactivateGroup,
  listGroupAthletes,
  listGroups,
  removeAthleteFromGroup,
  updateGroup,
  type GroupAthlete,
  type SchoolGroup
} from "./groupsApi";

type GroupFormValues = {
  name: string;
  description?: string;
};

export function GroupsPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<GroupFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SchoolGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SchoolGroup | null>(null);
  const [athleteToAdd, setAthleteToAdd] = useState<string | undefined>();
  const groupsQuery = useQuery({ queryKey: ["school", "groups"], queryFn: listGroups });
  const groupAthletesQuery = useQuery({
    enabled: selectedGroup !== null,
    queryKey: ["school", "groups", selectedGroup?.id, "athletes"],
    queryFn: () => listGroupAthletes(selectedGroup!.id)
  });
  const athletesQuery = useQuery({
    enabled: selectedGroup !== null,
    queryKey: ["school", "athletes", "all"],
    queryFn: () => listAthletes("")
  });

  const invalidateGroups = () => queryClient.invalidateQueries({ queryKey: ["school", "groups"] });
  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: ["school", "groups", selectedGroup?.id, "athletes"] });

  const saveGroup = useMutation({
    mutationFn: (values: GroupFormValues) => editingGroup
      ? updateGroup(editingGroup.id, values)
      : createGroup(values),
    onSuccess: () => {
      message.success(editingGroup ? "Grup güncellendi." : "Grup oluşturuldu.");
      setIsModalOpen(false);
      setEditingGroup(null);
      form.resetFields();
      void invalidateGroups();
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivate = useMutation({
    mutationFn: deactivateGroup,
    onSuccess: () => {
      message.success("Grup pasife alındı.");
      void invalidateGroups();
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const addAthlete = useMutation({
    mutationFn: (athleteId: string) => addAthleteToGroup(selectedGroup!.id, athleteId),
    onSuccess: () => {
      message.success("Sporcu gruba eklendi.");
      setAthleteToAdd(undefined);
      void invalidateMembers();
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const removeAthlete = useMutation({
    mutationFn: (athleteId: string) => removeAthleteFromGroup(selectedGroup!.id, athleteId),
    onSuccess: () => {
      message.success("Sporcu gruptan çıkarıldı.");
      void invalidateMembers();
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const memberIds = new Set((groupAthletesQuery.data ?? []).map((athlete) => athlete.id));
  const availableAthletes = (athletesQuery.data ?? []).filter((athlete) => !memberIds.has(athlete.id));

  function openCreateGroup() {
    setEditingGroup(null);
    form.resetFields();
    setIsModalOpen(true);
  }

  function openEditGroup(group: SchoolGroup) {
    setEditingGroup(group);
    form.setFieldsValue({ name: group.name, description: group.description ?? undefined });
    setIsModalOpen(true);
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Gruplar</Typography.Title>
          <Typography.Paragraph type="secondary">Grupları oluşturun ve sporcu kadrolarını yönetin.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateGroup}>Grup ekle</Button>
      </div>

      <Table<SchoolGroup>
        rowKey="id"
        loading={groupsQuery.isLoading}
        dataSource={groupsQuery.data ?? []}
        pagination={false}
        locale={{ emptyText: <Empty description="Henüz grup oluşturulmadı." /> }}
        columns={[
          { title: "Grup", dataIndex: "name", key: "name" },
          { title: "Açıklama", dataIndex: "description", key: "description", render: (value: string | null) => value ?? "—" },
          {
            title: "İşlemler",
            key: "actions",
            render: (_, group) => (
              <Space size="small" wrap>
                <Button size="small" icon={<TeamOutlined />} onClick={() => setSelectedGroup(group)}>Kadro</Button>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditGroup(group)}>Düzenle</Button>
                <Popconfirm title="Bu grup pasife alınsın mı?" description="Yeni antrenman ve kadro ataması yapılamaz." okText="Pasife al" cancelText="Vazgeç" onConfirm={() => deactivate.mutate(group.id)}>
                  <Button danger size="small" loading={deactivate.isPending}>Pasife al</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editingGroup ? "Grubu düzenle" : "Yeni grup"}
        open={isModalOpen}
        okText={editingGroup ? "Kaydet" : "Oluştur"}
        cancelText="Vazgeç"
        confirmLoading={saveGroup.isPending}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveGroup.mutate(values)}>
          <Form.Item name="name" label="Grup adı" rules={[{ required: true, message: "Grup adı zorunludur." }]}><Input autoFocus /></Form.Item>
          <Form.Item name="description" label="Açıklama"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Drawer title={selectedGroup ? `${selectedGroup.name} kadrosu` : "Grup kadrosu"} open={selectedGroup !== null} width={620} onClose={() => { setSelectedGroup(null); setAthleteToAdd(undefined); }}>
        <Space.Compact className="athlete-add-control">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Eklenecek sporcuyu seçin"
            loading={athletesQuery.isLoading}
            value={athleteToAdd}
            onChange={setAthleteToAdd}
            options={availableAthletes.map((athlete) => ({ value: athlete.id, label: `${athlete.firstName} ${athlete.lastName}` }))}
          />
          <Button type="primary" disabled={!athleteToAdd} loading={addAthlete.isPending} onClick={() => athleteToAdd && addAthlete.mutate(athleteToAdd)}>Ekle</Button>
        </Space.Compact>

        <Table<GroupAthlete>
          className="group-roster-table"
          rowKey="id"
          size="small"
          loading={groupAthletesQuery.isLoading}
          dataSource={groupAthletesQuery.data ?? []}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bu grupta sporcu yok." /> }}
          columns={[
            {
              title: "Sporcu",
              key: "athlete",
              render: (_, athlete) => <Space><Avatar src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} /><Typography.Text strong>{athlete.firstName} {athlete.lastName}</Typography.Text></Space>
            },
            { title: "Veli", dataIndex: "parentFullName", key: "parentFullName" },
            {
              title: "",
              key: "actions",
              render: (_, athlete) => (
                <Popconfirm title="Sporcu gruptan çıkarılsın mı?" okText="Çıkar" cancelText="Vazgeç" onConfirm={() => removeAthlete.mutate(athlete.id)}>
                  <Button danger size="small" icon={<DeleteOutlined />} loading={removeAthlete.isPending}>Çıkar</Button>
                </Popconfirm>
              )
            }
          ]}
        />
      </Drawer>
    </div>
  );
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Sporcu bu grupta zaten kayıtlı.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
