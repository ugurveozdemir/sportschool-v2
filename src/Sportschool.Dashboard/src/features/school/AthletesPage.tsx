import { MoreOutlined, PlusOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Avatar, Button, Card, Dropdown, Empty, Form, Input, Modal, Pagination, Select, Space, Table, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../app/api/apiClient";
import { createAthlete, deactivateAthlete, listAthleteRoster, listGroups, type Athlete, type CreateAthleteInput } from "./athletesApi";

const pageSize = 20;

export function AthletesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateAthleteInput>();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string>();
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<Athlete | null>(null);
  const athletesQuery = useQuery({
    queryKey: ["school", "athletes", { search, groupId, page, pageSize }],
    queryFn: () => listAthleteRoster(search, groupId, page, pageSize),
    placeholderData: (previousData) => previousData
  });
  const groupsQuery = useQuery({ queryKey: ["school", "groups"], queryFn: listGroups });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const createMutation = useMutation({
    mutationFn: createAthlete,
    onSuccess: () => {
      message.success("Sporcu ve veli hesabı oluşturuldu.");
      setIsCreateOpen(false);
      form.resetFields();
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateAthlete,
    onSuccess: () => {
      message.success("Sporcu pasife alındı.");
      setDeactivationTarget(null);
      if (page > 1 && (athletesQuery.data?.items.length ?? 0) === 1) setPage(page - 1);
      void queryClient.invalidateQueries({ queryKey: ["school", "athletes"] });
      void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] });
    },
    onError: (error) => message.error(errorMessage(error))
  });

  const athletes = athletesQuery.data?.items ?? [];
  const totalCount = athletesQuery.data?.totalCount ?? 0;

  function applySearch(value: string) {
    setSearchInput(value);
    setSearch(value.trim());
    setPage(1);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setGroupId(undefined);
    setPage(1);
  }

  function openCreate() {
    form.resetFields();
    setIsCreateOpen(true);
  }

  function handleAction(action: string, athlete: Athlete) {
    if (action === "details") {
      navigate(`/sporcular/${athlete.id}`);
      return;
    }

    setDeactivationTarget(athlete);
  }

  if (athletesQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        message="Sporcular yüklenemedi."
        description="Listeyi yenileyip tekrar deneyin."
        action={<Button onClick={() => void athletesQuery.refetch()}>Tekrar dene</Button>}
      />
    );
  }

  return (
    <div>
      <div className="page-heading athlete-page-heading">
        <div>
          <Typography.Title level={2}>Sporcular</Typography.Title>
          <Typography.Paragraph type="secondary">Sporcu ve veli hesaplarını okulunuza ekleyin.</Typography.Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Sporcu ekle</Button>
      </div>

      <Card className="athlete-roster-card">
        <div className="athlete-roster-toolbar">
          <Input.Search
            allowClear
            value={searchInput}
            placeholder="Sporcu veya veli ara"
            aria-label="Sporcu veya veli ara"
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={applySearch}
            onClear={() => applySearch("")}
          />
          <Select
            allowClear
            value={groupId}
            placeholder="Tüm gruplar"
            aria-label="Gruba göre filtrele"
            options={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))}
            loading={groupsQuery.isLoading}
            onChange={(value) => {
              setGroupId(value);
              setPage(1);
            }}
          />
          {(search || groupId) && <Button onClick={clearFilters}>Filtreleri temizle</Button>}
        </div>

        <div className="athlete-roster-summary" aria-live="polite">
          <Typography.Text type="secondary">
            {search || groupId ? `${totalCount} sporcu bulundu` : `${totalCount} aktif sporcu`}
          </Typography.Text>
          {search && <Typography.Text type="secondary">“{search}” aranıyor</Typography.Text>}
        </div>

        {athletesQuery.isLoading && !athletesQuery.data
          ? <Card loading bordered={false} />
          : athletes.length === 0
            ? <Empty className="athlete-roster-empty" description={emptyDescription(search)} />
            : (
              <>
                <div className="athlete-roster-table">
                  <Table<Athlete>
                    rowKey="id"
                    loading={athletesQuery.isFetching}
                    dataSource={athletes}
                    pagination={false}
                    columns={[
                      {
                        title: "Sporcu",
                        key: "athlete",
                        render: (_, athlete) => <AthleteIdentity athlete={athlete} />
                      },
                      {
                        title: "Grup",
                        key: "groups",
                        render: (_, athlete) => <AthleteGroups groups={athlete.groups} />
                      },
                      {
                        title: "Veli",
                        key: "parent",
                        render: (_, athlete) => <ParentContact athlete={athlete} />
                      },
                      {
                        title: "İşlemler",
                        key: "actions",
                        align: "right",
                        render: (_, athlete) => <AthleteActions athlete={athlete} onAction={handleAction} />
                      }
                    ]}
                  />
                </div>

                <div className="athlete-roster-cards">
                  {athletes.map((athlete) => (
                    <Card key={athlete.id} className="athlete-roster-item">
                      <div className="athlete-roster-item-heading">
                        <AthleteIdentity athlete={athlete} />
                        <AthleteActions athlete={athlete} onAction={handleAction} />
                      </div>
                      <div className="athlete-roster-item-details">
                        <div>
                          <Typography.Text type="secondary">Grup</Typography.Text>
                          <AthleteGroups groups={athlete.groups} />
                        </div>
                        <div>
                          <Typography.Text type="secondary">Veli</Typography.Text>
                          <ParentContact athlete={athlete} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <Pagination
                  className="athlete-roster-pagination"
                  current={page}
                  pageSize={pageSize}
                  total={totalCount}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total} sporcu`}
                  onChange={setPage}
                />
              </>
            )}
      </Card>

      <Modal
        title="Sporcu pasife alınsın mı?"
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
          {deactivationTarget ? `${deactivationTarget.firstName} ${deactivationTarget.lastName}` : "Bu sporcu"} artık giriş yapamayacak.
        </Typography.Paragraph>
      </Modal>

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
        <Form form={form} layout="vertical" initialValues={{ preferredFoot: "Unknown" }} onFinish={(values) => createMutation.mutate(values)}>
          <Typography.Title level={5}>Sporcu bilgileri</Typography.Title>
          <div className="form-grid">
            <Form.Item name="firstName" label="Ad" rules={[{ required: true, message: "Ad zorunludur." }]}><Input autoFocus /></Form.Item>
            <Form.Item name="lastName" label="Soyad" rules={[{ required: true, message: "Soyad zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="birthDate" label="Doğum tarihi" rules={[{ required: true, message: "Doğum tarihi zorunludur." }]}><Input type="date" /></Form.Item>
            <Form.Item name="preferredFoot" label="Baskın ayak" rules={[{ required: true, message: "Baskın ayak seçimi zorunludur." }]}><Select options={[
              { value: "Unknown", label: "Belirtilmedi" },
              { value: "Right", label: "Sağ" },
              { value: "Left", label: "Sol" },
              { value: "Both", label: "İki ayaklı" }
            ]} /></Form.Item>
            <Form.Item name="groupId" label="İlk grup"><Select allowClear loading={groupsQuery.isLoading} options={(groupsQuery.data ?? []).map((group) => ({ value: group.id, label: group.name }))} /></Form.Item>
            <Form.Item name="athleteEmail" label="Sporcu e-postası" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
            <Form.Item name="athletePassword" label="Sporcu ilk şifresi" rules={[{ required: true, min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}><Input.Password /></Form.Item>
          </div>

          <Typography.Title level={5}>Veli bilgileri</Typography.Title>
          <Typography.Paragraph type="secondary">Veli e-postası yeniyse ilk şifre zorunludur. Kayıtlı bir veli hesabı kullanıyorsanız şifreyi boş bırakın.</Typography.Paragraph>
          <div className="form-grid">
            <Form.Item name="parentFullName" label="Veli ad soyad" rules={[{ required: true, message: "Veli adı zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="parentPhone" label="Veli telefonu" rules={[{ required: true, message: "Telefon zorunludur." }]}><Input /></Form.Item>
            <Form.Item name="parentEmail" label="Veli e-postası" rules={[{ required: true, type: "email", message: "Geçerli bir e-posta girin." }]}><Input /></Form.Item>
            <Form.Item name="parentPassword" label="Veli ilk şifresi (yeni hesap için)" rules={[{ min: 8, message: "Şifre en az 8 karakter olmalıdır." }]}><Input.Password /></Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

function AthleteIdentity({ athlete }: { athlete: Athlete }) {
  const fullName = `${athlete.firstName} ${athlete.lastName}`;
  return (
    <Link className="athlete-table-link" to={`/sporcular/${athlete.id}`}>
      <Avatar src={athlete.profileImageUrl ?? undefined} icon={<UserOutlined />} />
      <span className="athlete-identity-copy">
        <Typography.Text strong>{fullName}</Typography.Text>
        <Typography.Text type="secondary">{formatAge(athlete.birthDate)} yaş · {formatDate(athlete.birthDate)}</Typography.Text>
      </span>
    </Link>
  );
}

function AthleteGroups({ groups }: { groups: Athlete["groups"] }) {
  return groups.length > 0
    ? <Space className="athlete-group-list" size={[4, 4]} wrap>{groups.map((group) => <Tag key={group.id}>{group.name}</Tag>)}</Space>
    : <Typography.Text type="secondary">Grup yok</Typography.Text>;
}

function ParentContact({ athlete }: { athlete: Athlete }) {
  return (
    <span className="athlete-parent-copy">
      <Typography.Text>{athlete.parentFullName}</Typography.Text>
      <Typography.Link href={`tel:${toTelNumber(athlete.parentPhone)}`}>{formatPhone(athlete.parentPhone)}</Typography.Link>
    </span>
  );
}

function AthleteActions({ athlete, onAction }: { athlete: Athlete; onAction: (action: string, athlete: Athlete) => void }) {
  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          { key: "details", label: "Detayı aç" },
          { type: "divider" },
          { key: "deactivate", danger: true, label: "Pasife al" }
        ],
        onClick: ({ key }) => onAction(key, athlete)
      }}
    >
      <Button type="text" icon={<MoreOutlined />} aria-label={`${athlete.firstName} ${athlete.lastName} işlemleri`} />
    </Dropdown>
  );
}

function emptyDescription(search: string): string {
  return search ? `“${search}” ile eşleşen sporcu bulunamadı.` : "Henüz aktif sporcu bulunmuyor.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${value}T00:00:00`));
}

function formatAge(birthDate: string): string {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthday) age--;
  return String(age);
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  return value;
}

function toTelNumber(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 409) return "Bu e-posta adresi okulda zaten kullanılıyor.";
  return "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.";
}
