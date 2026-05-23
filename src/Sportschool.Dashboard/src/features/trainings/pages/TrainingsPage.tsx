import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField, SelectField, TextareaField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { trainingRecurrences, type TrainingRecurrence } from "../../../shared/constants/domain";
import { endpoints } from "../../../shared/constants/endpoints";
import { createTraining, listGroupTrainings } from "../api/trainingsApi";

export function TrainingsPage() {
  const [groupId, setGroupId] = useState("");
  const [training, setTraining] = useState({
    groupId: "",
    title: "",
    startsAt: "",
    endsAt: "",
    recurrence: "None" as TrainingRecurrence,
    recurrenceEndsOn: "",
    location: "",
    notes: ""
  });
  const trainingsQuery = useQuery({
    queryKey: ["trainings", groupId],
    queryFn: () => listGroupTrainings(groupId),
    enabled: false
  });
  const createMutation = useMutation({
    mutationFn: () =>
      createTraining({
        ...training,
        startsAt: new Date(training.startsAt).toISOString(),
        endsAt: new Date(training.endsAt).toISOString(),
        recurrenceEndsOn: training.recurrence === "Weekly" && training.recurrenceEndsOn ? training.recurrenceEndsOn : null,
        location: training.location || null,
        notes: training.notes || null
      }),
    onSuccess: () => {
      if (groupId) {
        void trainingsQuery.refetch();
      }
    }
  });

  return (
    <div>
      <PageHeader title="Antrenmanlar" description="Antrenman seansı oluşturma ve grup bazlı listeleme." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="POST" onSubmit={() => createMutation.mutate()} path={endpoints.schoolTrainings} title="Seans oluştur">
            <div className="form-grid">
              <InputField label="GroupId" onChange={(e) => setTraining({ ...training, groupId: e.target.value })} value={training.groupId} />
              <InputField label="Başlık" onChange={(e) => setTraining({ ...training, title: e.target.value })} value={training.title} />
              <InputField label="Başlangıç" onChange={(e) => setTraining({ ...training, startsAt: e.target.value })} type="datetime-local" value={training.startsAt} />
              <InputField label="Bitiş" onChange={(e) => setTraining({ ...training, endsAt: e.target.value })} type="datetime-local" value={training.endsAt} />
              <SelectField
                label="Tekrar"
                onChange={(e) => setTraining({ ...training, recurrence: e.target.value as TrainingRecurrence })}
                value={training.recurrence}
              >
                {trainingRecurrences.map((recurrence) => (
                  <option key={recurrence} value={recurrence}>
                    {recurrence}
                  </option>
                ))}
              </SelectField>
              <InputField label="Tekrar Bitişi" onChange={(e) => setTraining({ ...training, recurrenceEndsOn: e.target.value })} type="date" value={training.recurrenceEndsOn} />
              <InputField label="Konum" onChange={(e) => setTraining({ ...training, location: e.target.value })} value={training.location} />
              <TextareaField label="Not" onChange={(e) => setTraining({ ...training, notes: e.target.value })} value={training.notes} />
            </div>
          </EndpointCard>

          <EndpointCard
            method="GET"
            onSubmit={() => groupId && void trainingsQuery.refetch()}
            path={groupId ? endpoints.groupTrainings(groupId) : "/api/school/groups/{groupId}/trainings"}
            title="Grup antrenmanları"
          >
            <InputField label="GroupId" onChange={(e) => setGroupId(e.target.value)} value={groupId} />
            <div style={{ marginTop: 16 }}>
              <DataTable
                emptyText="Antrenman yok."
                items={trainingsQuery.data ?? []}
                columns={[
                  { key: "title", header: "Başlık", render: (item) => item.title },
                  { key: "startsAt", header: "Başlangıç", render: (item) => new Date(item.startsAt).toLocaleString("tr-TR") },
                  { key: "recurrence", header: "Tekrar", render: (item) => item.recurrence },
                  { key: "id", header: "TrainingId", render: (item) => <code>{item.id}</code> }
                ]}
              />
            </div>
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
