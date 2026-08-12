import { MoreOutlined, PlusOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Checkbox, Dropdown, Empty, Form, Input, Modal, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
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
  const navigate = useNavigate();
  const [form] = Form.useForm<GroupFormValues>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SchoolGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SchoolGroup | null>(null);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[] | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<SchoolGroup | null>(null);
  const groupsQuery = useQuery({
    queryKey: ["school", "groups", { search }],
    queryFn: () => listGroups(search),
    placeholderData: (previousData) => previousData
  });
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

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

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
      if (selectedGroup?.id === deactivationTarget?.id) closeRoster();
      setDeactivationTarget(null);
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

  function handleAction(action: string, group: SchoolGroup) {
    if (action === "roster") {
      if (selectedGroup?.id === group.id) {
        closeRoster();
      } else {
        openRoster(group);
      }
      return;
    }

    if (action === "details") {
      navigate(`/gruplar/${group.id}`);
      return;
    }

    if (action === "edit") {
      openEditGroup(group);
      return;
    }

    setDeactivationTarget(group);
  }

  if (groupsQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        message="Gruplar yüklenemedi."
        description="Listeyi yenileyip tekrar deneyin."
        action={<Button onClick={() => void groupsQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  const groups = groupsQuery.data ?? [];

  return (
    <div>
      <div className="page-heading group-page-heading">
        <div>
          <Typography.Title level={2}>Gruplar</Typography.Title>
          <Typography.Paragraph type="secondary">Grupları oluşturun ve sporcu kadrolarını yönetin.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateGroup}>Grup ekle</Button>
      </div>

      <Card className="group-roster-card">
        <Input.Search
          className="group-roster-search"
          allowClear
          value={searchInput}
          placeholder="Grup ara"
          aria-label="Grup ara"
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setSearchInput(value);
            setSearch(value.trim());
          }}
          onClear={() => {
            setSearchInput("");
            setSearch("");
          }}
        />

        <div className="group-roster-summary" aria-live="polite">
          <Typography.Text type="secondary">{search ? `${groups.length} grup bulundu` : `${groups.length} aktif grup`}</Typography.Text>
          {search && <Typography.Text type="secondary">“{search}” aranıyor</Typography.Text>}
        </div>

        {groupsQuery.isLoading && !groupsQuery.data
          ? <Card loading bordered={false} />
          : groups.length === 0
            ? <Empty className="group-roster-empty" description={emptyDescription(search)} />
            : (
              <>
                <div className="group-roster-table">
                  <Table<SchoolGroup>
                    rowKey="id"
                    loading={groupsQuery.isFetching}
                    dataSource={groups}
                    pagination={false}
                    expandable={{
                      expandedRowKeys: selectedGroup ? [selectedGroup.id] : [],
                      expandIcon: () => null,
                      expandedRowRender: (group) => group.id === selectedGroup?.id && <GroupRosterEditor />
                    }}
                    columns={[
                      { title: "Grup", key: "group", render: (_, group) => <GroupIdentity group={group} /> },
                      { title: "Kadro ve plan", key: "summary", render: (_, group) => <GroupSummary group={group} /> },
                      { title: "İşlemler", key: "actions", align: "right", render: (_, group) => <GroupActions group={group} onAction={handleAction} /> }
                    ]}
                  />
                </div>

                <div className="group-roster-cards">
                  {groups.map((group) => (
                    <Card key={group.id} className="group-roster-item">
                      <div className="group-roster-item-heading">
                        <GroupIdentity group={group} />
                        <GroupActions group={group} onAction={handleAction} />
                      </div>
                      <GroupSummary group={group} />
                    </Card>
                  ))}
                </div>

                {selectedGroup && (
                  <Card className="group-roster-editor-card">
                    <Typography.Title level={4}>{selectedGroup.name} kadrosu</Typography.Title>
                    <GroupRosterEditor />
                  </Card>
                )}
              </>
            )}
      </Card>

      <Modal
        title="Grup pasife alınsın mı?"
        open={deactivationTarget !== null}
        okText="Pasife al"
        cancelText="Vazgeç"
        okButtonProps={{ danger: true }}
        confirmLoading={deactivate.isPending}
        onCancel={() => setDeactivationTarget(null)}
        onOk={() => {
          if (deactivationTarget) deactivate.mutate(deactivationTarget.id);
        }}
      >
        <Typography.Paragraph>
          {deactivationTarget?.name ?? "Bu grup"} için yeni kadro ve antrenman ataması yapılamaz.
        </Typography.Paragraph>
      </Modal>

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

  function GroupRosterEditor() {
    return (
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
    );
  }
}

function GroupIdentity({ group }: { group: SchoolGroup }) {
  return (
    <span className="group-identity-copy">
      <Typography.Text strong>{group.name}</Typography.Text>
      <Typography.Text type="secondary">{group.description ?? "Açıklama eklenmemiş."}</Typography.Text>
    </span>
  );
}

function GroupSummary({ group }: { group: SchoolGroup }) {
  const athleteText = group.athleteCount === 1 ? "1 sporcu" : `${group.athleteCount} sporcu`;
  const trainingText = group.upcomingTrainingCount === 1 ? "1 yaklaşan antrenman" : `${group.upcomingTrainingCount} yaklaşan antrenman`;

  return (
    <Space className="group-summary-tags" size={[4, 4]} wrap>
      <Tag icon={<TeamOutlined />} color="blue">{athleteText}</Tag>
      {group.upcomingTrainingCount > 0
        ? <Tag color="green">{trainingText}</Tag>
        : <Typography.Text type="secondary">Yaklaşan antrenman yok</Typography.Text>}
    </Space>
  );
}

function GroupActions({ group, onAction }: { group: SchoolGroup; onAction: (action: string, group: SchoolGroup) => void }) {
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "details", label: "Detayı aç" },
          { key: "roster", label: "Kadroyu düzenle" },
          { key: "edit", label: "Grubu düzenle" },
          { type: "divider" },
          { key: "deactivate", danger: true, label: "Pasife al" }
        ],
        onClick: ({ key }) => onAction(key, group)
      }}
    >
      <Button type="text" icon={<MoreOutlined />} aria-label={`${group.name} işlemleri`} />
    </Dropdown>
  );
}

function emptyDescription(search: string): string {
  return search ? `“${search}” ile eşleşen grup bulunamadı.` : "Henüz aktif grup bulunmuyor.";
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Sporcu bu grupta zaten kayıtlı.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
