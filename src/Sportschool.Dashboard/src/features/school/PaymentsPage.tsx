import { CheckOutlined, SettingOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Empty, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from "antd";
import { useState } from "react";
import { ApiError } from "../../app/api/apiClient";
import { getPaymentSettings, listMonthlyPayments, savePayment, updatePaymentSettings, type MonthlyPayment, type PaymentStatus } from "./paymentsApi";

type PaymentForm = { amount: number; status: PaymentStatus; paidOn?: string };
type SettingsForm = { defaultMonthlyFee?: number; paymentDayOfMonth?: number };
const currentMonth = new Date().toISOString().slice(0, 7);

export function PaymentsPage() {
  const queryClient = useQueryClient(); const [paymentForm] = Form.useForm<PaymentForm>(); const [settingsForm] = Form.useForm<SettingsForm>();
  const [month, setMonth] = useState(currentMonth); const [selectedPayment, setSelectedPayment] = useState<MonthlyPayment | null>(null); const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [year, monthNumber] = month.split("-").map(Number);
  const paymentsQuery = useQuery({ queryKey: ["school", "payments", year, monthNumber], queryFn: () => listMonthlyPayments(year, monthNumber) });
  const settingsQuery = useQuery({ queryKey: ["school", "payment-settings"], queryFn: getPaymentSettings });
  const paymentMutation = useMutation({ mutationFn: (values: PaymentForm) => savePayment(selectedPayment!.athleteProfileId, year, monthNumber, { amount: values.amount, status: values.status, paidOn: values.status === "Paid" ? values.paidOn ?? new Date().toISOString().slice(0, 10) : null }), onSuccess: () => { message.success("Ödeme kaydedildi."); setSelectedPayment(null); void queryClient.invalidateQueries({ queryKey: ["school", "payments"] }); void queryClient.invalidateQueries({ queryKey: ["school", "dashboard"] }); }, onError: (error) => message.error(errorMessage(error)) });
  const settingsMutation = useMutation({ mutationFn: (values: SettingsForm) => updatePaymentSettings({ defaultMonthlyFee: values.defaultMonthlyFee ?? null, paymentDayOfMonth: values.paymentDayOfMonth ?? null }), onSuccess: () => { message.success("Ödeme ayarları kaydedildi."); setIsSettingsOpen(false); void queryClient.invalidateQueries({ queryKey: ["school", "payment-settings"] }); void queryClient.invalidateQueries({ queryKey: ["school", "payments"] }); }, onError: (error) => message.error(errorMessage(error)) });
  function openPayment(row: MonthlyPayment) { setSelectedPayment(row); paymentForm.setFieldsValue({ amount: row.amount ?? undefined, status: row.effectiveStatus === "Paid" ? "Paid" : "Unpaid", paidOn: row.paidOn ?? undefined }); }
  function openSettings() { settingsForm.setFieldsValue({ defaultMonthlyFee: settingsQuery.data?.defaultMonthlyFee ?? undefined, paymentDayOfMonth: settingsQuery.data?.paymentDayOfMonth ?? undefined }); setIsSettingsOpen(true); }
  return <div>
    <div className="page-heading"><div><Typography.Title level={2}>Ödemeler</Typography.Title><Typography.Paragraph type="secondary">Aylık aidatları takip edin ve ödeme kayıtlarını yönetin.</Typography.Paragraph></div><Space><Input type="month" value={month} onChange={(event) => setMonth(event.target.value || currentMonth)} /><Button icon={<SettingOutlined />} onClick={openSettings}>Ayarlar</Button></Space></div>
    {paymentsQuery.isError && <Alert showIcon type="error" message="Ödemeler yüklenemedi." action={<Button size="small" onClick={() => void paymentsQuery.refetch()}>Tekrar dene</Button>} />}
    {settingsQuery.isError && <Alert showIcon type="warning" message="Ödeme ayarları yüklenemedi." action={<Button size="small" onClick={() => void settingsQuery.refetch()}>Tekrar dene</Button>} />}
    <Table<MonthlyPayment> rowKey="athleteProfileId" loading={paymentsQuery.isLoading} dataSource={paymentsQuery.data ?? []} pagination={{ pageSize: 12, showSizeChanger: false }} locale={{ emptyText: <Empty description="Bu ay için sporcu bulunmuyor." /> }} columns={[
      { title: "Sporcu", dataIndex: "athleteName", key: "athleteName", render: (name, row) => <><Typography.Text strong>{name}</Typography.Text><br /><Typography.Text type="secondary">{row.parentFullName}</Typography.Text></> },
      { title: "Tutar", dataIndex: "amount", key: "amount", render: formatCurrency }, { title: "Kalan", dataIndex: "balance", key: "balance", render: formatCurrency },
      { title: "Durum", key: "status", render: (_, row) => statusTag(row.effectiveStatus) },
      { title: "İşlem", key: "action", render: (_, row) => <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => openPayment(row)}>Ödeme işle</Button> }
    ]} />
    <Modal title={`${selectedPayment?.athleteName ?? ""} ödemesi`} open={selectedPayment !== null} okText="Kaydet" cancelText="Vazgeç" confirmLoading={paymentMutation.isPending} onCancel={() => setSelectedPayment(null)} onOk={() => paymentForm.submit()}><Form form={paymentForm} layout="vertical" onFinish={(values) => paymentMutation.mutate(values)}><Form.Item name="amount" label="Toplam tutar" rules={[{ required: true, message: "Tutar zorunludur." }, { type: "number", min: 0.01, message: "Tutar sıfırdan büyük olmalıdır." }]}><InputNumber min={0.01} precision={2} className="full-width" /></Form.Item><Form.Item name="status" label="Durum" rules={[{ required: true }]}><Select options={[{ value: "Paid", label: "Ödendi" }, { value: "Unpaid", label: "Ödenmedi" }, { value: "Pending", label: "Bekliyor" }]} /></Form.Item><Form.Item name="paidOn" label="Ödeme tarihi"><Input type="date" /></Form.Item></Form></Modal>
    <Modal title="Ödeme ayarları" open={isSettingsOpen} okText="Kaydet" cancelText="Vazgeç" confirmLoading={settingsMutation.isPending} onCancel={() => setIsSettingsOpen(false)} onOk={() => settingsForm.submit()}><Form form={settingsForm} layout="vertical" onFinish={(values) => settingsMutation.mutate(values)}><Form.Item name="defaultMonthlyFee" label="Varsayılan aylık aidat"><InputNumber min={0} precision={2} className="full-width" /></Form.Item><Form.Item name="paymentDayOfMonth" label="Ödeme günü"><InputNumber min={1} max={28} className="full-width" /><Typography.Text type="secondary">Her ay 1–28 arasında bir gün seçin.</Typography.Text></Form.Item></Form></Modal>
  </div>;
}
function formatCurrency(value: number | null): string { return value === null ? "—" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value); }
function statusTag(status: PaymentStatus) { const label = status === "Paid" ? "Ödendi" : status === "Unpaid" ? "Ödenmedi" : "Bekliyor"; const color = status === "Paid" ? "green" : status === "Unpaid" ? "red" : "gold"; return <Tag color={color}>{label}</Tag>; }
function errorMessage(error: Error): string { return error instanceof ApiError && error.status === 400 ? "Ödeme bilgilerini kontrol edin." : "İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin."; }
