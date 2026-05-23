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
  approveAthleteApplication,
  createAthleteApplication,
  listAthleteApplications,
  rejectAthleteApplication
} from "../api/applicationsApi";

export function ApplicationsPage() {
  const [application, setApplication] = useState({
    schoolCode: "",
    athleteFirstName: "",
    athleteLastName: "",
    athleteBirthDate: "",
    athleteEmail: "",
    password: "",
    parentFullName: "",
    parentPhone: ""
  });
  const applicationsQuery = useQuery({ queryKey: ["applications"], queryFn: listAthleteApplications, enabled: false });
  const createMutation = useMutation({ mutationFn: createAthleteApplication });
  const approveMutation = useMutation({
    mutationFn: approveAthleteApplication,
    onSuccess: () => void applicationsQuery.refetch()
  });
  const rejectMutation = useMutation({
    mutationFn: rejectAthleteApplication,
    onSuccess: () => void applicationsQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Başvurular" description="Sporcu başvurusu oluşturma ve okul admin kararı." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard
            method="POST"
            onSubmit={() => createMutation.mutate(application)}
            path={endpoints.athleteApplications}
            title="Public başvuru"
          >
            <div className="form-grid">
              {[
                ["schoolCode", "Okul Kodu"],
                ["athleteFirstName", "Sporcu Adı"],
                ["athleteLastName", "Sporcu Soyadı"],
                ["athleteBirthDate", "Doğum Tarihi"],
                ["athleteEmail", "Sporcu E-posta"],
                ["password", "Şifre"],
                ["parentFullName", "Veli Ad Soyad"],
                ["parentPhone", "Veli Telefon"]
              ].map(([key, label]) => (
                <InputField
                  key={key}
                  label={label}
                  onChange={(event) => setApplication({ ...application, [key]: event.target.value })}
                  type={key === "password" ? "password" : key === "athleteBirthDate" ? "date" : "text"}
                  value={application[key as keyof typeof application]}
                />
              ))}
            </div>
          </EndpointCard>

          <EndpointCard
            method="GET"
            onSubmit={() => void applicationsQuery.refetch()}
            path={endpoints.schoolAthleteApplications}
            title="Başvuru listesi"
          >
            <DataTable
              emptyText="Başvuru yok."
              items={applicationsQuery.data ?? []}
              columns={[
                { key: "name", header: "Sporcu", render: (item) => `${item.athleteFirstName} ${item.athleteLastName}` },
                { key: "email", header: "E-posta", render: (item) => item.athleteEmail },
                { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.status} /> },
                {
                  key: "actions",
                  header: "İşlem",
                  render: (item) => (
                    <div className="table-actions">
                      <button className="button button-secondary" onClick={() => approveMutation.mutate(item.id)} type="button">
                        Onayla
                      </button>
                      <button className="button button-danger" onClick={() => rejectMutation.mutate(item.id)} type="button">
                        Reddet
                      </button>
                    </div>
                  )
                }
              ]}
            />
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
