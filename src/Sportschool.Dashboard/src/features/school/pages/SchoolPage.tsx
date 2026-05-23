import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { endpoints } from "../../../shared/constants/endpoints";
import { createCoach, listAthletes, listCoaches, listUsers } from "../api/schoolApi";

export function SchoolPage() {
  const [coach, setCoach] = useState({ email: "", fullName: "" });
  const usersQuery = useQuery({ queryKey: ["school", "users"], queryFn: listUsers, enabled: false });
  const coachesQuery = useQuery({ queryKey: ["school", "coaches"], queryFn: listCoaches, enabled: false });
  const athletesQuery = useQuery({ queryKey: ["school", "athletes"], queryFn: listAthletes, enabled: false });
  const createCoachMutation = useMutation({
    mutationFn: createCoach,
    onSuccess: () => void coachesQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Okul" description="Okul kullanıcıları, koçlar ve sporcular." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void usersQuery.refetch()} path={endpoints.schoolUsers} title="Kullanıcılar">
            <DataTable
              emptyText="Kullanıcı yok."
              items={usersQuery.data ?? []}
              columns={[
                { key: "fullName", header: "Ad Soyad", render: (item) => item.fullName },
                { key: "email", header: "E-posta", render: (item) => item.email },
                { key: "roles", header: "Roller", render: (item) => item.roles.join(", ") }
              ]}
            />
          </EndpointCard>

          <EndpointCard method="GET" onSubmit={() => void coachesQuery.refetch()} path={endpoints.schoolCoaches} title="Koçlar">
            <DataTable
              emptyText="Koç yok."
              items={coachesQuery.data ?? []}
              columns={[
                { key: "fullName", header: "Ad Soyad", render: (item) => item.fullName },
                { key: "email", header: "E-posta", render: (item) => item.email },
                { key: "id", header: "Id", render: (item) => <code>{item.id}</code> }
              ]}
            />
          </EndpointCard>

          <EndpointCard method="POST" onSubmit={() => createCoachMutation.mutate(coach)} path={endpoints.schoolCoaches} title="Koç oluştur">
            <div className="form-grid">
              <InputField label="Ad Soyad" onChange={(e) => setCoach({ ...coach, fullName: e.target.value })} value={coach.fullName} />
              <InputField label="E-posta" onChange={(e) => setCoach({ ...coach, email: e.target.value })} value={coach.email} />
            </div>
          </EndpointCard>

          <EndpointCard method="GET" onSubmit={() => void athletesQuery.refetch()} path={endpoints.schoolAthletes} title="Sporcular">
            <DataTable
              emptyText="Sporcu yok."
              items={athletesQuery.data ?? []}
              columns={[
                { key: "name", header: "Ad Soyad", render: (item) => `${item.firstName} ${item.lastName}` },
                { key: "birthDate", header: "Doğum", render: (item) => item.birthDate },
                { key: "parent", header: "Veli", render: (item) => item.parentFullName },
                { key: "phone", header: "Telefon", render: (item) => item.parentPhone },
                { key: "id", header: "AthleteId", render: (item) => <code>{item.id}</code> }
              ]}
            />
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
