import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField, SelectField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { paymentStatuses, type PaymentStatus } from "../../../shared/constants/domain";
import type { MonthlyPaymentResponse } from "../../../shared/types/domain";
import { listMonthlyPayments, upsertPayment } from "../api/paymentsApi";

export function PaymentsPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<MonthlyPaymentResponse | null>(null);
  const [form, setForm] = useState({ amount: 0, status: "Pending" as PaymentStatus, paidOn: "" });
  const paymentsQuery = useQuery({
    queryKey: ["monthly-payments", year, month],
    queryFn: () => listMonthlyPayments(year, month)
  });
  const saveMutation = useMutation({
    mutationFn: () =>
      upsertPayment(selected!.athleteProfileId, year, month, {
        amount: form.amount,
        status: form.status,
        paidOn: form.paidOn || null
      }),
    onSuccess: () => {
      setSelected(null);
      void paymentsQuery.refetch();
    }
  });

  return (
    <div>
      <PageHeader title="Ödemeler" description="Seçili ay için tüm sporcuların ödeme durumunu takip et ve güncelle." />
      <section className="card">
        <div className="card-header">
          <strong>Aylık takip</strong>
          <div className="inline-fields">
            <InputField label="Yıl" onChange={(e) => setYear(Number(e.target.value))} type="number" value={year} />
            <InputField label="Ay" max={12} min={1} onChange={(e) => setMonth(Number(e.target.value))} type="number" value={month} />
          </div>
        </div>
        <div className="card-body">
          <DataTable
            emptyText={paymentsQuery.isLoading ? "Yükleniyor..." : "Sporcu yok."}
            items={paymentsQuery.data ?? []}
            columns={[
              { key: "athlete", header: "Sporcu", render: (item) => item.athleteName },
              { key: "parent", header: "Veli", render: (item) => `${item.parentFullName} · ${item.parentPhone}` },
              { key: "amount", header: "Tutar", render: (item) => item.amount ?? "Kayıt yok" },
              { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.effectiveStatus} /> },
              {
                key: "actions",
                header: "İşlem",
                render: (item) => (
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setSelected(item);
                      setForm({ amount: item.amount ?? 0, status: item.status ?? "Pending", paidOn: item.paidOn ?? "" });
                    }}
                    type="button"
                  >
                    Güncelle
                  </button>
                )
              }
            ]}
          />
        </div>
      </section>

      {selected ? (
        <section className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <strong>{selected.athleteName} ödeme kaydı</strong>
          </div>
          <div className="card-body stack">
            <div className="form-grid">
              <InputField label="Tutar" onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} type="number" value={form.amount} />
              <SelectField label="Durum" onChange={(e) => setForm({ ...form, status: e.target.value as PaymentStatus })} value={form.status}>
                {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </SelectField>
              <InputField label="Ödeme Tarihi" onChange={(e) => setForm({ ...form, paidOn: e.target.value })} type="date" value={form.paidOn} />
            </div>
            <div className="actions-row">
              <button className="button button-secondary" onClick={() => setSelected(null)} type="button">Vazgeç</button>
              <button className="button button-primary" disabled={form.amount <= 0 || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
                Kaydet
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
