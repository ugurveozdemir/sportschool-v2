import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../../shared/components/DataTable";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import { endpoints } from "../../../shared/constants/endpoints";
import {
  getMyProfile,
  listMyAttendance,
  listMyGroups,
  listMyPayments,
  listMyReports,
  listMyTrainings
} from "../api/meApi";

export function MePage() {
  const profileQuery = useQuery({ queryKey: ["me", "profile"], queryFn: getMyProfile, enabled: false });
  const groupsQuery = useQuery({ queryKey: ["me", "groups"], queryFn: listMyGroups, enabled: false });
  const trainingsQuery = useQuery({ queryKey: ["me", "trainings"], queryFn: listMyTrainings, enabled: false });
  const attendanceQuery = useQuery({ queryKey: ["me", "attendance"], queryFn: listMyAttendance, enabled: false });
  const paymentsQuery = useQuery({ queryKey: ["me", "payments"], queryFn: listMyPayments, enabled: false });
  const reportsQuery = useQuery({ queryKey: ["me", "reports"], queryFn: listMyReports, enabled: false });

  return (
    <div>
      <PageHeader title="Ben" description="Veli/sporcu mobil okuma endpointleri." />
      <div className="page-grid">
        <div className="stack">
          <EndpointCard method="GET" onSubmit={() => void profileQuery.refetch()} path={endpoints.meProfile} title="Profil">
            <DataTable
              emptyText="Profil henüz yüklenmedi."
              items={profileQuery.data ? [profileQuery.data] : []}
              columns={[
                { key: "name", header: "Ad Soyad", render: (item) => `${item.firstName} ${item.lastName}` },
                { key: "birthDate", header: "Doğum", render: (item) => item.birthDate },
                { key: "parent", header: "Veli", render: (item) => item.parentFullName }
              ]}
            />
          </EndpointCard>
          <EndpointCard method="GET" onSubmit={() => void groupsQuery.refetch()} path={endpoints.meGroups} title="Gruplarım">
            <DataTable emptyText="Grup yok." items={groupsQuery.data ?? []} columns={[{ key: "name", header: "Ad", render: (item) => item.name }]} />
          </EndpointCard>
          <EndpointCard method="GET" onSubmit={() => void trainingsQuery.refetch()} path={endpoints.meTrainings} title="Antrenmanlarım">
            <DataTable
              emptyText="Antrenman yok."
              items={trainingsQuery.data ?? []}
              columns={[
                { key: "title", header: "Başlık", render: (item) => item.title },
                { key: "startsAt", header: "Başlangıç", render: (item) => new Date(item.startsAt).toLocaleString("tr-TR") }
              ]}
            />
          </EndpointCard>
          <EndpointCard method="GET" onSubmit={() => void attendanceQuery.refetch()} path={endpoints.meAttendance} title="Yoklamalarım">
            <DataTable
              emptyText="Yoklama yok."
              items={attendanceQuery.data ?? []}
              columns={[
                { key: "training", header: "TrainingId", render: (item) => <code>{item.trainingSessionId}</code> },
                { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.status} /> }
              ]}
            />
          </EndpointCard>
          <EndpointCard method="GET" onSubmit={() => void paymentsQuery.refetch()} path={endpoints.mePayments} title="Ödemelerim">
            <DataTable
              emptyText="Ödeme yok."
              items={paymentsQuery.data ?? []}
              columns={[
                { key: "period", header: "Dönem", render: (item) => `${item.month}/${item.year}` },
                { key: "status", header: "Durum", render: (item) => <StatusBadge value={item.effectiveStatus} /> }
              ]}
            />
          </EndpointCard>
          <EndpointCard method="GET" onSubmit={() => void reportsQuery.refetch()} path={endpoints.meAthleteReports} title="Raporlarım">
            <DataTable
              emptyText="Rapor yok."
              items={reportsQuery.data ?? []}
              columns={[
                { key: "summary", header: "Özet", render: (item) => item.summary },
                { key: "createdAt", header: "Tarih", render: (item) => new Date(item.createdAt).toLocaleString("tr-TR") }
              ]}
            />
          </EndpointCard>
        </div>
        <ResponseInspector />
      </div>
    </div>
  );
}
