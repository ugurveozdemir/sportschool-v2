import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField, SelectField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { attendanceStatuses, type AttendanceStatus } from "../../../shared/constants/domain";
import { endpoints } from "../../../shared/constants/endpoints";
import { createAttendance, listAttendance, updateAttendance } from "../api/attendanceApi";

export function AttendancePage() {
  const [trainingId, setTrainingId] = useState("");
  const [attendance, setAttendance] = useState({ athleteProfileId: "", status: "Present" as AttendanceStatus });
  const attendanceQuery = useQuery({
    queryKey: ["attendance", trainingId],
    queryFn: () => listAttendance(trainingId),
    enabled: false
  });
  const createMutation = useMutation({
    mutationFn: () => createAttendance(trainingId, attendance),
    onSuccess: () => void attendanceQuery.refetch()
  });
  const updateMutation = useMutation({
    mutationFn: () => updateAttendance(trainingId, attendance.athleteProfileId, attendance),
    onSuccess: () => void attendanceQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Yoklama" description="Antrenman bazında sporcu katılım kayıtları." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard
            method="GET"
            onSubmit={() => trainingId && void attendanceQuery.refetch()}
            path={trainingId ? endpoints.trainingAttendance(trainingId) : "/api/school/trainings/{trainingId}/attendance"}
            title="Yoklama listesi"
          >
            <InputField label="TrainingId" onChange={(e) => setTrainingId(e.target.value)} value={trainingId} />
            <div style={{ marginTop: 16 }}>
              <DataTable
                emptyText="Yoklama kaydı yok."
                items={attendanceQuery.data ?? []}
                columns={[
                  { key: "athlete", header: "AthleteId", render: (item) => <code>{item.athleteProfileId}</code> },
                  { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.status} /> },
                  { key: "recordedAt", header: "Kayıt", render: (item) => new Date(item.recordedAt).toLocaleString("tr-TR") }
                ]}
              />
            </div>
          </EndpointCard>

          <EndpointCard
            method="POST"
            onSubmit={() => trainingId && createMutation.mutate()}
            path={trainingId ? endpoints.trainingAttendance(trainingId) : "/api/school/trainings/{trainingId}/attendance"}
            title="Yoklama oluştur"
          >
            <div className="form-grid">
              <InputField label="TrainingId" onChange={(e) => setTrainingId(e.target.value)} value={trainingId} />
              <InputField
                label="AthleteProfileId"
                onChange={(e) => setAttendance({ ...attendance, athleteProfileId: e.target.value })}
                value={attendance.athleteProfileId}
              />
              <SelectField
                label="Durum"
                onChange={(e) => setAttendance({ ...attendance, status: e.target.value as AttendanceStatus })}
                value={attendance.status}
              >
                {attendanceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </SelectField>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="button button-secondary" onClick={() => updateMutation.mutate()} type="button">
                Mevcut Kaydı Güncelle
              </button>
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
