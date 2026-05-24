import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { DataTable } from "../../../shared/components/DataTable";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { attendanceStatuses, type AttendanceStatus } from "../../../shared/constants/domain";
import { endOfWeekFromToday, formatDateTime, startOfToday } from "../../../shared/utils/date";
import { listTrainings } from "../../trainings/api/trainingsApi";
import { createAttendance, getAttendanceRoster, updateAttendance } from "../api/attendanceApi";

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTrainingId = searchParams.get("trainingId") ?? "";
  const trainingsQuery = useQuery({
    queryKey: ["attendance-trainings"],
    queryFn: () => listTrainings(startOfToday().toISOString(), endOfWeekFromToday().toISOString())
  });
  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", selectedTrainingId],
    queryFn: () => getAttendanceRoster(selectedTrainingId),
    enabled: Boolean(selectedTrainingId)
  });
  const saveMutation = useMutation({
    mutationFn: ({ athleteProfileId, status, hasRecord }: { athleteProfileId: string; status: AttendanceStatus; hasRecord: boolean }) =>
      hasRecord
        ? updateAttendance(selectedTrainingId, athleteProfileId, { athleteProfileId, status })
        : createAttendance(selectedTrainingId, { athleteProfileId, status }),
    onSuccess: () => void rosterQuery.refetch()
  });

  return (
    <div>
      <PageHeader title="Yoklama" description="Seans seç, grup sporcularını gör ve katılım durumunu tek ekrandan güncelle." />
      <div className="content-grid">
        <section className="card">
          <div className="card-header">
            <strong>Bu haftaki seanslar</strong>
          </div>
          <div className="card-body stack">
            {trainingsQuery.data?.map((training) => (
              <button
                className={`training-button${training.id === selectedTrainingId ? " active" : ""}`}
                key={training.id}
                onClick={() => setSearchParams({ trainingId: training.id })}
                type="button"
              >
                <strong>{training.title}</strong>
                <span>{training.groupName} · {formatDateTime(training.startsAt)}</span>
                <small>{training.attendanceSummary.recordedCount}/{training.attendanceSummary.totalAthletes} yoklama</small>
              </button>
            ))}
            {trainingsQuery.data?.length === 0 ? <div className="empty-state">Bu hafta seans yok.</div> : null}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>{rosterQuery.data?.training.title ?? "Yoklama listesi"}</strong>
            {rosterQuery.data ? <span className="muted">{rosterQuery.data.training.groupName}</span> : null}
          </div>
          <div className="card-body">
            {!selectedTrainingId ? <div className="empty-state">Yoklama almak için bir seans seç.</div> : null}
            {selectedTrainingId ? (
              <DataTable
                emptyText={rosterQuery.isLoading ? "Yükleniyor..." : "Bu grupta sporcu yok."}
                items={rosterQuery.data?.athletes ?? []}
                columns={[
                  { key: "athlete", header: "Sporcu", render: (item) => `${item.firstName} ${item.lastName}` },
                  { key: "parent", header: "Veli", render: (item) => `${item.parentFullName} · ${item.parentPhone}` },
                  { key: "status", header: "Durum", render: (item) => item.status ? <StatusBadge value={item.status} /> : "İşaretlenmedi" },
                  {
                    key: "actions",
                    header: "İşaretle",
                    render: (item) => (
                      <div className="segmented-actions">
                        {attendanceStatuses.map((status) => (
                          <button
                            className={item.status === status ? "active" : ""}
                            disabled={saveMutation.isPending}
                            key={status}
                            onClick={() => saveMutation.mutate({ athleteProfileId: item.athleteProfileId, status, hasRecord: Boolean(item.status) })}
                            type="button"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )
                  }
                ]}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
