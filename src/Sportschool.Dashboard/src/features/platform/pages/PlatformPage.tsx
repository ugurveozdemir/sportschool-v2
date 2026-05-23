import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { endpoints } from "../../../shared/constants/endpoints";
import type { SchoolResponse } from "../../../shared/types/domain";
import {
  createSchool,
  createSchoolAdmin,
  deactivateSchool,
  listSchoolAdmins,
  listSchools
} from "../api/platformApi";

export function PlatformPage() {
  const [school, setSchool] = useState({ name: "", code: "" });
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [admin, setAdmin] = useState({ email: "", fullName: "" });
  const schoolsQuery = useQuery({ queryKey: ["platform", "schools"], queryFn: listSchools });
  const adminsQuery = useQuery({
    queryKey: ["platform", "school-admins", selectedSchoolId],
    queryFn: () => listSchoolAdmins(selectedSchoolId),
    enabled: false
  });
  const createSchoolMutation = useMutation({
    mutationFn: createSchool,
    onSuccess: () => void schoolsQuery.refetch()
  });
  const deactivateMutation = useMutation({
    mutationFn: deactivateSchool,
    onSuccess: () => void schoolsQuery.refetch()
  });
  const createAdminMutation = useMutation({
    mutationFn: () => createSchoolAdmin(selectedSchoolId, admin),
    onSuccess: () => {
      if (selectedSchoolId) {
        void adminsQuery.refetch();
      }
    }
  });

  return (
    <div>
      <PageHeader title="Platform" description="Okul ve okul yöneticisi operasyonları." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void schoolsQuery.refetch()} path={endpoints.platformSchools} title="Okullar">
            <DataTable
              emptyText="Okul yok."
              items={schoolsQuery.data ?? []}
              columns={[
                { key: "name", header: "Ad", render: (item) => item.name },
                { key: "code", header: "Kod", render: (item) => <code>{item.code}</code> },
                { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.isActive} /> },
                {
                  key: "actions",
                  header: "İşlem",
                  render: (item: SchoolResponse) => (
                    <div className="table-actions">
                      <button className="button button-secondary" onClick={() => setSelectedSchoolId(item.id)} type="button">
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

          <EndpointCard
            method="POST"
            onSubmit={() => createSchoolMutation.mutate(school)}
            path={endpoints.platformSchools}
            title="Okul oluştur"
          >
            <div className="form-grid">
              <InputField label="Okul Adı" onChange={(e) => setSchool({ ...school, name: e.target.value })} value={school.name} />
              <InputField label="Okul Kodu" onChange={(e) => setSchool({ ...school, code: e.target.value })} value={school.code} />
            </div>
          </EndpointCard>

          <EndpointCard
            method="GET"
            onSubmit={() => selectedSchoolId && void adminsQuery.refetch()}
            path={selectedSchoolId ? endpoints.platformSchoolAdmins(selectedSchoolId) : "/api/platform/schools/{schoolId}/admins"}
            title="Okul adminleri"
          >
            <InputField label="SchoolId" onChange={(e) => setSelectedSchoolId(e.target.value)} value={selectedSchoolId} />
            <div style={{ marginTop: 16 }}>
              <DataTable
                emptyText="Admin kaydı yok."
                items={adminsQuery.data ?? []}
                columns={[
                  { key: "fullName", header: "Ad Soyad", render: (item) => item.fullName },
                  { key: "email", header: "E-posta", render: (item) => item.email },
                  { key: "id", header: "Id", render: (item) => <code>{item.id}</code> }
                ]}
              />
            </div>
          </EndpointCard>

          <EndpointCard
            method="POST"
            onSubmit={() => selectedSchoolId && createAdminMutation.mutate()}
            path={selectedSchoolId ? endpoints.platformSchoolAdmins(selectedSchoolId) : "/api/platform/schools/{schoolId}/admins"}
            title="Okul admini oluştur"
          >
            <div className="form-grid">
              <InputField label="SchoolId" onChange={(e) => setSelectedSchoolId(e.target.value)} value={selectedSchoolId} />
              <InputField label="Ad Soyad" onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })} value={admin.fullName} />
              <InputField label="E-posta" onChange={(e) => setAdmin({ ...admin, email: e.target.value })} value={admin.email} />
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
