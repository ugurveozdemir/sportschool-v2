import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { routes } from "../../../config/routes";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField, SelectField, TextareaField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { trainingRecurrences, type TrainingRecurrence } from "../../../shared/constants/domain";
import { endOfWeekFromToday, formatDateTime, startOfToday, toDateTimeLocalValue } from "../../../shared/utils/date";
import { listGroups } from "../../groups/api/groupsApi";
import { createTraining, deactivateTraining, listTrainings, updateTraining } from "../api/trainingsApi";

export function TrainingsPage() {
  const [from, setFrom] = useState(toDateTimeLocalValue(startOfToday()));
  const [to, setTo] = useState(toDateTimeLocalValue(endOfWeekFromToday()));
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    groupId: "",
    title: "",
    startsAt: "",
    endsAt: "",
    recurrence: "None" as TrainingRecurrence,
    recurrenceEndsOn: "",
    location: "",
    notes: ""
  });
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const trainingsQuery = useQuery({
    queryKey: ["trainings", from, to],
    queryFn: () => listTrainings(new Date(from).toISOString(), new Date(to).toISOString())
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createTraining({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        recurrenceEndsOn: form.recurrence === "Weekly" && form.recurrenceEndsOn ? form.recurrenceEndsOn : null,
        location: form.location || null,
        notes: form.notes || null
      }),
    onSuccess: () => void trainingsQuery.refetch()
  });
  const updateMutation = useMutation({
    mutationFn: () =>
      updateTraining(editingId, {
        title: form.title,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        location: form.location || null,
        notes: form.notes || null
      }),
    onSuccess: () => {
      setEditingId("");
      void trainingsQuery.refetch();
    }
  });
  const deactivateMutation = useMutation({ mutationFn: deactivateTraining, onSuccess: () => void trainingsQuery.refetch() });

  return (
    <div>
      <PageHeader title="Antrenmanlar" description="Bugün ve hafta içindeki seansları planla, düzenle ve yoklamaya geç." />
      <section className="card">
        <div className="card-header">
          <strong>Hafta görünümü</strong>
          <div className="inline-fields">
            <InputField label="Başlangıç" onChange={(e) => setFrom(e.target.value)} type="datetime-local" value={from} />
            <InputField label="Bitiş" onChange={(e) => setTo(e.target.value)} type="datetime-local" value={to} />
          </div>
        </div>
        <div className="card-body">
          <DataTable
            emptyText={trainingsQuery.isLoading ? "Yükleniyor..." : "Antrenman yok."}
            items={trainingsQuery.data ?? []}
            columns={[
              { key: "time", header: "Saat", render: (item) => formatDateTime(item.startsAt) },
              { key: "title", header: "Başlık", render: (item) => item.title },
              { key: "group", header: "Grup", render: (item) => item.groupName },
              {
                key: "attendance",
                header: "Yoklama",
                render: (item) => `${item.attendanceSummary.recordedCount}/${item.attendanceSummary.totalAthletes}`
              },
              {
                key: "actions",
                header: "İşlem",
                render: (item) => (
                  <div className="table-actions">
                    <Link className="button button-primary" to={`${routes.attendance}?trainingId=${item.id}`}>Yoklama</Link>
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({
                          groupId: item.groupId,
                          title: item.title,
                          startsAt: toDateTimeLocalValue(new Date(item.startsAt)),
                          endsAt: toDateTimeLocalValue(new Date(item.endsAt)),
                          recurrence: "None",
                          recurrenceEndsOn: "",
                          location: item.location ?? "",
                          notes: ""
                        });
                      }}
                      type="button"
                    >
                      Düzenle
                    </button>
                    <button className="button button-danger" onClick={() => deactivateMutation.mutate(item.id)} type="button">
                      Pasifleştir
                    </button>
                  </div>
                )
              }
            ]}
          />
        </div>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <strong>{editingId ? "Seansı düzenle" : "Yeni seans oluştur"}</strong>
        </div>
        <div className="card-body stack">
          <div className="form-grid">
            <SelectField label="Grup" onChange={(e) => setForm({ ...form, groupId: e.target.value })} value={form.groupId} disabled={Boolean(editingId)}>
              <option value="">Grup seç</option>
              {(groupsQuery.data ?? []).map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </SelectField>
            <InputField label="Başlık" onChange={(e) => setForm({ ...form, title: e.target.value })} value={form.title} />
            <InputField label="Başlangıç" onChange={(e) => setForm({ ...form, startsAt: e.target.value })} type="datetime-local" value={form.startsAt} />
            <InputField label="Bitiş" onChange={(e) => setForm({ ...form, endsAt: e.target.value })} type="datetime-local" value={form.endsAt} />
            {!editingId ? (
              <>
                <SelectField label="Tekrar" onChange={(e) => setForm({ ...form, recurrence: e.target.value as TrainingRecurrence })} value={form.recurrence}>
                  {trainingRecurrences.map((recurrence) => <option key={recurrence} value={recurrence}>{recurrence}</option>)}
                </SelectField>
                <InputField label="Tekrar Bitişi" onChange={(e) => setForm({ ...form, recurrenceEndsOn: e.target.value })} type="date" value={form.recurrenceEndsOn} />
              </>
            ) : null}
            <InputField label="Konum" onChange={(e) => setForm({ ...form, location: e.target.value })} value={form.location} />
            <TextareaField label="Not" onChange={(e) => setForm({ ...form, notes: e.target.value })} value={form.notes} />
          </div>
          <div className="actions-row">
            {editingId ? <button className="button button-secondary" onClick={() => setEditingId("")} type="button">Vazgeç</button> : null}
            <button
              className="button button-primary"
              disabled={!form.title || !form.startsAt || !form.endsAt || (!editingId && !form.groupId)}
              onClick={() => (editingId ? updateMutation.mutate() : createMutation.mutate())}
              type="button"
            >
              {editingId ? "Güncelle" : "Oluştur"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
