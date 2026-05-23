import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { endpoints } from "../../../shared/constants/endpoints";
import {
  addAthleteToGroup,
  createGroup,
  deactivateGroup,
  listGroups,
  removeAthleteFromGroup,
  updateGroup
} from "../api/groupsApi";

export function GroupsPage() {
  const [group, setGroup] = useState({ groupId: "", name: "", description: "" });
  const [membership, setMembership] = useState({ groupId: "", athleteProfileId: "" });
  const groupsQuery = useQuery({ queryKey: ["groups"], queryFn: listGroups, enabled: false });
  const createMutation = useMutation({ mutationFn: createGroup, onSuccess: () => void groupsQuery.refetch() });
  const updateMutation = useMutation({
    mutationFn: () => updateGroup(group.groupId, { name: group.name, description: group.description || null }),
    onSuccess: () => void groupsQuery.refetch()
  });
  const deactivateMutation = useMutation({ mutationFn: deactivateGroup, onSuccess: () => void groupsQuery.refetch() });
  const addMutation = useMutation({ mutationFn: () => addAthleteToGroup(membership.groupId, membership.athleteProfileId) });
  const removeMutation = useMutation({ mutationFn: () => removeAthleteFromGroup(membership.groupId, membership.athleteProfileId) });

  return (
    <div>
      <PageHeader title="Gruplar" description="Antrenman grupları ve sporcu üyelikleri." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void groupsQuery.refetch()} path={endpoints.schoolGroups} title="Grup listesi">
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
                        onClick={() => setGroup({ groupId: item.id, name: item.name, description: item.description ?? "" })}
                        type="button"
                      >
                        Seç
                      </button>
                      <button className="button button-danger" onClick={() => deactivateMutation.mutate(item.id)} type="button">
                        Pasifleştir
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </EndpointCard>

          <EndpointCard method="POST" onSubmit={() => createMutation.mutate(group)} path={endpoints.schoolGroups} title="Grup oluştur">
            <div className="form-grid">
              <InputField label="Ad" onChange={(e) => setGroup({ ...group, name: e.target.value })} value={group.name} />
              <InputField label="Açıklama" onChange={(e) => setGroup({ ...group, description: e.target.value })} value={group.description} />
            </div>
          </EndpointCard>

          <EndpointCard
            method="PUT"
            onSubmit={() => group.groupId && updateMutation.mutate()}
            path={group.groupId ? endpoints.schoolGroup(group.groupId) : "/api/school/groups/{groupId}"}
            title="Grup güncelle"
          >
            <div className="form-grid">
              <InputField label="GroupId" onChange={(e) => setGroup({ ...group, groupId: e.target.value })} value={group.groupId} />
              <InputField label="Ad" onChange={(e) => setGroup({ ...group, name: e.target.value })} value={group.name} />
              <InputField label="Açıklama" onChange={(e) => setGroup({ ...group, description: e.target.value })} value={group.description} />
            </div>
          </EndpointCard>

          <EndpointCard
            method="POST"
            onSubmit={() => addMutation.mutate()}
            path="/api/school/groups/{groupId}/athletes/{athleteProfileId}"
            title="Sporcuyu gruba ekle/çıkar"
          >
            <div className="form-grid">
              <InputField label="GroupId" onChange={(e) => setMembership({ ...membership, groupId: e.target.value })} value={membership.groupId} />
              <InputField
                label="AthleteProfileId"
                onChange={(e) => setMembership({ ...membership, athleteProfileId: e.target.value })}
                value={membership.athleteProfileId}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="button button-secondary" onClick={() => removeMutation.mutate()} type="button">
                Çıkar
              </button>
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
