import { EditOutlined, PlusOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Checkbox, Empty, Form, Input, Modal, Popconfirm, Space, Table, Typography, message } from "antd";
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
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[] | null>(null);
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
  const rosterAthleteIds = selectedAthleteIds ?? (groupAthletesQuery.data ?? []).map((athlete) => athlete.id);

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

  const updateRoster = useMutation({
    mutationFn: async () => {
      const memberIds = new Set((groupAthletesQuery.data ?? []).map((athlete) => athlete.id));
      const selectedIds = new Set(rosterAthleteIds);
      const athletesToAdd = rosterAthleteIds.filter((athleteId) => !memberIds.has(athleteId));
      const athletesToRemove = [...memberIds].filter((athleteId) => !selectedIds.has(athleteId));

      await Promise.all([
        ...athletesToAdd.map((athleteId) => addAthleteToGroup(selectedGroup!.id, athleteId)),
        ...athletesToRemove.map((athleteId) => removeAthleteFromGroup(selectedGroup!.id, athleteId))
      ]);
    },
    onSuccess: () => {
      message.success("Grup kadrosu güncellendi.");
      void invalidateMembers();
    },
    onError: (error) => message.error(errorMessage(error))
  });

  function openRoster(group: SchoolGroup) {
    setSelectedAthleteIds(null);
    setSelectedGroup(group);
  }

  function closeRoster() {
    setSelectedAthleteIds(null);
    setSelectedGroup(null);
  }

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
        expandable={{
          expandedRowKeys: selectedGroup ? [selectedGroup.id] : [],
          expandIcon: () => null,
          expandedRowRender: (group) => group.id === selectedGroup?.id && (
            <div className="group-roster-editor">
              <Typography.Text type="secondary">Gruba dahil olacak sporcuları seçin.</Typography.Text>
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
                <Button disabled={updateRoster.isPending} onClick={closeRoster}>Kapat</Button>
              </Space>
            </div>
          )
        }}
        columns={[
          { title: "Grup", dataIndex: "name", key: "name" },
          { title: "Açıklama", dataIndex: "description", key: "description", render: (value: string | null) => value ?? "—" },
          {
            title: "İşlemler",
            key: "actions",
            render: (_, group) => (
              <Space size="small" wrap>
                <Button size="small" icon={<TeamOutlined />} onClick={() => selectedGroup?.id === group.id ? closeRoster() : openRoster(group)}>Kadro</Button>
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
    </div>
  );
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Sporcu bu grupta zaten kayıtlı.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
