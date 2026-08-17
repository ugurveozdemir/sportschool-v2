import { CopyOutlined, MoreOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Dropdown, Empty, Form, Input, Modal, Pagination, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { createCoach, deactivateCoach, listCoachRoster, type Coach, type CreatedCoach } from "./coachesApi";

const pageSize = 20;

type CoachFormValues = {
  fullName: string;
  email: string;
};

export function CoachesPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CoachFormValues>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdCoach, setCreatedCoach] = useState<CreatedCoach | null>(null);
  const [deactivationTarget, setDeactivationTarget] = useState<Coach | null>(null);
  const coachesQuery = useQuery({
    queryKey: ["school", "coaches", { search, page, pageSize }],
    queryFn: () => listCoachRoster(search, page, pageSize),
    placeholderData: (previousData) => previousData
  });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const createMutation = useMutation({
    mutationFn: createCoach,
    onSuccess: (coach) => {
      setIsCreateOpen(false);
      form.resetFields();
      setCreatedCoach(coach);
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["school", "coaches"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateCoach,
    onSuccess: () => {
      message.success("Antrenör pasife alındı.");
      setDeactivationTarget(null);
      if (page > 1 && (coachesQuery.data?.items.length ?? 0) === 1) setPage(page - 1);
      void queryClient.invalidateQueries({ queryKey: ["school", "coaches"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const coaches = coachesQuery.data?.items ?? [];
  const totalCount = coachesQuery.data?.totalCount ?? 0;

  async function copyPassword() {
    if (!createdCoach?.temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(createdCoach.temporaryPassword);
      message.success("Geçici şifre kopyalandı.");
    } catch {
      message.error("Şifre kopyalanamadı. Lütfen elle kopyalayın.");
    }
  }

  function applySearch(value: string) {
    setSearchInput(value);
    setSearch(value.trim());
    setPage(1);
  }

  function openCreate() {
    form.resetFields();
    setIsCreateOpen(true);
  }

  if (coachesQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        message="Antrenörler yüklenemedi."
        description="Listeyi yenileyip tekrar deneyin."
        action={<Button onClick={() => void coachesQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  return (
    <div>
      <div className="page-heading coach-page-heading">
        <div>
          <Typography.Title level={2}>Antrenörler</Typography.Title>
          <Typography.Paragraph type="secondary">Antrenör hesaplarını yönetin. Pasif bir hesabı aynı e-postayla yeniden aktifleştirebilirsiniz.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Antrenör ekle</Button>
      </div>

      <Card className="coach-roster-card">
        <Input.Search
          className="coach-roster-search"
          allowClear
          value={searchInput}
          placeholder="Antrenör veya e-posta ara"
          aria-label="Antrenör veya e-posta ara"
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={applySearch}
          onClear={() => applySearch("")}
        />

        <div className="coach-roster-summary" aria-live="polite">
          <Typography.Text type="secondary">
            {search ? `${totalCount} antrenör bulundu` : `${totalCount} aktif antrenör`}
          </Typography.Text>
          {search && <Typography.Text type="secondary">“{search}” aranıyor</Typography.Text>}
        </div>

        {coachesQuery.isLoading && !coachesQuery.data
          ? <Card loading bordered={false} />
          : coaches.length === 0
            ? <Empty className="coach-roster-empty" description={emptyDescription(search)} />
            : (
              <>
                <div className="coach-roster-table">
                  <Table<Coach>
                    rowKey="id"
                    loading={coachesQuery.isFetching}
                    dataSource={coaches}
                    pagination={false}
                    columns={[
                      { title: "Antrenör", key: "coach", render: (_, coach) => <CoachIdentity coach={coach} /> },
                      { title: "Rol", key: "roles", render: (_, coach) => <CoachRoles coach={coach} /> },
                      { title: "Yaklaşan antrenman", key: "training", render: (_, coach) => <UpcomingTraining coach={coach} /> },
                      { title: "İşlemler", key: "actions", align: "right", render: (_, coach) => <CoachActions coach={coach} onDeactivate={setDeactivationTarget} /> }
                    ]}
                  />
                </div>

                <div className="coach-roster-cards">
                  {coaches.map((coach) => (
                    <Card key={coach.id} className="coach-roster-item">
                      <div className="coach-roster-item-heading">
                        <CoachIdentity coach={coach} />
                        <CoachActions coach={coach} onDeactivate={setDeactivationTarget} />
                      </div>
                      <div className="coach-roster-item-details">
                        <div>
                          <Typography.Text type="secondary">Rol</Typography.Text>
                          <CoachRoles coach={coach} />
                        </div>
                        <div>
                          <Typography.Text type="secondary">Yaklaşan antrenman</Typography.Text>
                          <UpcomingTraining coach={coach} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Pagination
                  className="coach-roster-pagination"
                  current={page}
                  pageSize={pageSize}
                  total={totalCount}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total} antrenör`}
                  onChange={setPage}
                />
              </>
            )}
      </Card>

      <Modal
        title="Antrenör pasife alınsın mı?"
        open={deactivationTarget !== null}
        okText="Pasife al"
        cancelText="Vazgeç"
        okButtonProps={{ danger: true }}
        confirmLoading={deactivateMutation.isPending}
        onCancel={() => setDeactivationTarget(null)}
        onOk={() => {
          if (deactivationTarget) deactivateMutation.mutate(deactivationTarget.id);
        }}
      >
        <Typography.Paragraph>
          {deactivationTarget?.fullName ?? "Bu antrenör"} artık mobil uygulamaya giriş yapamayacak.
        </Typography.Paragraph>
      </Modal>

      <Modal title="Yeni antrenör" open={isCreateOpen} okText="Antrenör ekle" cancelText="Vazgeç" confirmLoading={createMutation.isPending} onCancel={() => setIsCreateOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="fullName" label="Ad soyad" rules={[{ required: true, message: "Ad soyad zorunludur." }]}><Input autoFocus /></Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title={createdCoach?.isReactivated ? "Antrenör yeniden aktifleştirildi" : "Antrenör hesabı hazır"} open={createdCoach !== null} footer={<Button type="primary" onClick={() => setCreatedCoach(null)}>Tamam</Button>} closable={false}>
        {createdCoach?.isReactivated ? (
          <Typography.Paragraph><Typography.Text strong>{createdCoach.fullName}</Typography.Text> mevcut şifresiyle yeniden giriş yapabilir.</Typography.Paragraph>
        ) : createdCoach?.temporaryPassword ? (
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

function CoachIdentity({ coach }: { coach: Coach }) {
  return (
    <span className="coach-identity">
      <Avatar icon={<UserOutlined />} />
      <span className="coach-identity-copy">
        <Link to={`/antrenorler/${coach.id}`}><Typography.Text strong>{coach.fullName}</Typography.Text></Link>
        <Typography.Link href={`mailto:${coach.email}`}>{coach.email}</Typography.Link>
      </span>
    </span>
  );
}

function CoachRoles({ coach }: { coach: Coach }) {
  return (
    <Space size={[4, 4]} wrap>
      <Tag color="green">Aktif</Tag>
      {coach.roles.includes("SchoolAdmin") && <Tag color="blue">Yönetici</Tag>}
    </Space>
  );
}

function UpcomingTraining({ coach }: { coach: Coach }) {
  if (!coach.nextTraining) return <Typography.Text type="secondary">Planlı antrenman yok</Typography.Text>;

  const countText = coach.upcomingTrainingCount === 1 ? "1 yaklaşan antrenman" : `${coach.upcomingTrainingCount} yaklaşan antrenman`;
  return (
    <span className="coach-training-copy">
      <Typography.Text>{coach.nextTraining.title}</Typography.Text>
      <Typography.Text type="secondary">{formatTrainingDate(coach.nextTraining.startsAt)} · {countText}</Typography.Text>
      {coach.nextTraining.groups.length > 0 && (
        <Space size={[4, 4]} wrap>
          {coach.nextTraining.groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}
        </Space>
      )}
    </span>
  );
}

function CoachActions({ coach, onDeactivate }: { coach: Coach; onDeactivate: (coach: Coach) => void }) {
  if (coach.roles.includes("SchoolAdmin")) {
    return <Typography.Text type="secondary">Korumalı hesap</Typography.Text>;
  }

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [{ key: "deactivate", danger: true, label: "Pasife al" }],
        onClick: () => onDeactivate(coach)
      }}
    >
      <Button type="text" icon={<MoreOutlined />} aria-label={`${coach.fullName} işlemleri`} />
    </Dropdown>
  );
}

function emptyDescription(search: string): string {
  return search ? `“${search}” ile eşleşen antrenör bulunamadı.` : "Henüz aktif antrenör bulunmuyor.";
}

function formatTrainingDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Bu e-posta zaten okulda kayıtlı veya pasif durumda.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
