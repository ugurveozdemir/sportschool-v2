import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField, SelectField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { paymentStatuses, type PaymentStatus } from "../../../shared/constants/domain";
import { endpoints } from "../../../shared/constants/endpoints";
import { listPayments, upsertPayment } from "../api/paymentsApi";

export function PaymentsPage() {
  const [athleteProfileId, setAthleteProfileId] = useState("");
  const [payment, setPayment] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: 0,
    status: "Pending" as PaymentStatus,
    paidOn: ""
  });
  const paymentsQuery = useQuery({
    queryKey: ["payments", athleteProfileId],
    queryFn: () => listPayments(athleteProfileId),
    enabled: false
  });
  const upsertMutation = useMutation({
    mutationFn: () =>
      upsertPayment(athleteProfileId, payment.year, payment.month, {
        amount: payment.amount,
        status: payment.status,
        paidOn: payment.paidOn || null
      }),
    onSuccess: () => void paymentsQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Ödemeler" description="Sporcu aylık ödeme kayıtları." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard
            method="GET"
            onSubmit={() => athleteProfileId && void paymentsQuery.refetch()}
            path={athleteProfileId ? endpoints.athletePayments(athleteProfileId) : "/api/school/athletes/{athleteProfileId}/payments"}
            title="Ödeme listesi"
          >
            <InputField label="AthleteProfileId" onChange={(e) => setAthleteProfileId(e.target.value)} value={athleteProfileId} />
            <div style={{ marginTop: 16 }}>
              <DataTable
                emptyText="Ödeme kaydı yok."
                items={paymentsQuery.data ?? []}
                columns={[
                  { key: "period", header: "Dönem", render: (item) => `${item.month}/${item.year}` },
                  { key: "amount", header: "Tutar", render: (item) => item.amount },
                  { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.status} /> },
                  { key: "effective", header: "Efektif", render: (item) => <StatusBadge value={item.effectiveStatus} /> }
                ]}
              />
            </div>
          </EndpointCard>

          <EndpointCard
            method="PUT"
            onSubmit={() => athleteProfileId && upsertMutation.mutate()}
            path="/api/school/athletes/{athleteProfileId}/payments/{year}/{month}"
            title="Ödeme kaydet"
          >
            <div className="form-grid">
              <InputField label="AthleteProfileId" onChange={(e) => setAthleteProfileId(e.target.value)} value={athleteProfileId} />
              <InputField label="Yıl" onChange={(e) => setPayment({ ...payment, year: Number(e.target.value) })} type="number" value={payment.year} />
              <InputField label="Ay" onChange={(e) => setPayment({ ...payment, month: Number(e.target.value) })} type="number" value={payment.month} />
              <InputField label="Tutar" onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} type="number" value={payment.amount} />
              <SelectField
                label="Durum"
                onChange={(e) => setPayment({ ...payment, status: e.target.value as PaymentStatus })}
                value={payment.status}
              >
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectField>
              <InputField label="Ödeme Tarihi" onChange={(e) => setPayment({ ...payment, paidOn: e.target.value })} type="date" value={payment.paidOn} />
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
