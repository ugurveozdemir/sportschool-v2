import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField, SelectField, TextareaField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import type { GroupResponse } from "../../../shared/types/domain";
import { listAthletes } from "../../school/api/schoolApi";
import {
  addAthleteToGroup,
  createGroup,
  deactivateGroup,
  listGroupAthletes,
  listGroups,
  removeAthleteFromGroup,
  updateGroup
} from "../api/groupsApi";

export function GroupsPage() {
  const [selectedGroup, setSelectedGroup] = useState<GroupResponse | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [athleteToAdd, setAthleteToAdd] = useState("");
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: listGroups });
  const athletesQuery = useQuery({ queryKey: ["athletes-for-groups"], queryFn: () => listAthletes() });
  const groupAthletesQuery = useQuery({
    queryKey: ["group-athletes", selectedGroup?.id],
    queryFn: () => listGroupAthletes(selectedGroup!.id),
    enabled: Boolean(selectedGroup)
  });
  const createMutation = useMutation({ mutationFn: createGroup, onSuccess: () => void groupsQuery.refetch() });
  const updateMutation = useMutation({
    mutationFn: () => updateGroup(selectedGroup!.id, { name: form.name, description: form.description || null }),
    onSuccess: () => void groupsQuery.refetch()
  });
  const deactivateMutation = useMutation({ mutationFn: deactivateGroup, onSuccess: () => void groupsQuery.refetch() });
  const addMutation = useMutation({
    mutationFn: () => addAthleteToGroup(selectedGroup!.id, athleteToAdd),
    onSuccess: () => {
      setAthleteToAdd("");
      void groupAthletesQuery.refetch();
    }
  });
  const removeMutation = useMutation({
    mutationFn: (athleteProfileId: string) => removeAthleteFromGroup(selectedGroup!.id, athleteProfileId),
    onSuccess: () => void groupAthletesQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Gruplar" description="Grupları yönet, sporcuları seçerek ekle veya çıkar." />
      <div className="content-grid">
        <section className="card">
          <div className="card-header"><strong>Gruplar</strong></div>
          <div className="card-body">
            <DataTable
              emptyText="Grup yok."
              items={groupsQuery.data ?? []}
              columns={[
                { key: "name", header: "Ad", render: (item) => item.name },
                { key: "description", header: "Açıklama", render: (item) => item.description ?? "-" },
                { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.isActive} /> },
                {
                  key: "actions",
                  header: "İşlem",
                  render: (item) => (
                    <div className="table-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => {
                          setSelectedGroup(item);
                          setForm({ name: item.name, description: item.description ?? "" });
                        }}
                        type="button"
                      >
                        Aç
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

        <section className="card">
          <div className="card-header">
            <strong>{selectedGroup ? `${selectedGroup.name} grubu` : "Grup detayı"}</strong>
          </div>
          <div className="card-body stack">
            <div className="form-grid">
              <InputField label="Grup Adı" onChange={(e) => setForm({ ...form, name: e.target.value })} value={form.name} />
              <TextareaField label="Açıklama" onChange={(e) => setForm({ ...form, description: e.target.value })} value={form.description} />
            </div>
            <div className="actions-row">
              <button className="button button-secondary" disabled={!selectedGroup || !form.name} onClick={() => updateMutation.mutate()} type="button">
                Güncelle
              </button>
              <button className="button button-primary" disabled={!form.name} onClick={() => createMutation.mutate(form)} type="button">
                Yeni grup oluştur
              </button>
            </div>

            {selectedGroup ? (
              <>
                <div className="inline-fields">
                  <SelectField label="Sporcu ekle" onChange={(e) => setAthleteToAdd(e.target.value)} value={athleteToAdd}>
                    <option value="">Sporcu seç</option>
                    {(athletesQuery.data ?? []).map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>{athlete.firstName} {athlete.lastName}</option>
                    ))}
                  </SelectField>
                  <button className="button button-primary" disabled={!athleteToAdd} onClick={() => addMutation.mutate()} type="button">Ekle</button>
                </div>
                <DataTable
                  emptyText="Grupta sporcu yok."
                  items={groupAthletesQuery.data ?? []}
                  columns={[
                    { key: "name", header: "Sporcu", render: (item) => `${item.firstName} ${item.lastName}` },
                    { key: "parent", header: "Veli", render: (item) => `${item.parentFullName} · ${item.parentPhone}` },
                    {
                      key: "actions",
                      header: "İşlem",
                      render: (item) => (
                        <button className="button button-danger" onClick={() => removeMutation.mutate(item.id)} type="button">Çıkar</button>
                      )
                    }
                  ]}
                />
              </>
            ) : <div className="empty-state">Sporcuları yönetmek için bir grup aç.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
