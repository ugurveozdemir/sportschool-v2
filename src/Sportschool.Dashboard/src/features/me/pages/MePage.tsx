import { useQuery } from "@tanstack/react-query";
import { DataTable } from "../../../shared/components/DataTable";
import { PageHeader } from "../../../shared/components/PageHeader";
import { StatusBadge } from "../../../shared/components/StatusBadge";
import {
  getMyProfile,
  listMyAttendance,
  listMyGroups,
  listMyPayments,
  listMyReports,
  listMyTrainings
} from "../api/meApi";

export function MePage() {
  const profileQuery = useQuery({ queryKey: ["me", "profile"], queryFn: getMyProfile });
  const groupsQuery = useQuery({ queryKey: ["me", "groups"], queryFn: listMyGroups });
  const trainingsQuery = useQuery({ queryKey: ["me", "trainings"], queryFn: listMyTrainings });
  const attendanceQuery = useQuery({ queryKey: ["me", "attendance"], queryFn: listMyAttendance });
  const paymentsQuery = useQuery({ queryKey: ["me", "payments"], queryFn: listMyPayments });
  const reportsQuery = useQuery({ queryKey: ["me", "reports"], queryFn: listMyReports });

  const profile = profileQuery.data;

  return (
    <div>
      <PageHeader title="Profilim" description="Kişisel bilgileriniz, antrenman programınız ve gelişim durumunuz." />
      
      {profile && (
        <div className="card mb-6" style={{ background: "linear-gradient(135deg, var(--primary-soft) 0%, #fff 100%)", border: "1px solid var(--primary-soft)" }}>
          <div className="card-body">
            <h2 className="text-2xl font-bold text-primary mb-1">{profile.firstName} {profile.lastName}</h2>
            <p className="text-muted-foreground text-sm mb-4">Sporcu Profili</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Doğum Tarihi</span>
                <strong>{new Date(profile.birthDate).toLocaleDateString("tr-TR")}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Veli Adı</span>
                <strong>{profile.parentFullName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block">Veli Telefon</span>
                <strong>{profile.parentPhone}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card">
          <div className="card-header">
            <strong>Gruplarım</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Kayıtlı grup bulunamadı."
              items={groupsQuery.data ?? []}
              columns={[{ key: "name", header: "Grup Adı", render: (item) => item.name }]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Antrenman Programı</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Yaklaşan antrenman bulunamadı."
              items={trainingsQuery.data ?? []}
              columns={[
                { key: "title", header: "Başlık", render: (item) => item.title },
                { key: "startsAt", header: "Tarih & Saat", render: (item) => new Date(item.startsAt).toLocaleString("tr-TR") },
                { key: "location", header: "Konum", render: (item) => item.location ?? "Belirtilmemiş" }
              ]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Yoklama Geçmişi</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Katılım kaydı bulunamadı."
              items={attendanceQuery.data ?? []}
              columns={[
                { key: "training", header: "Katılınan Antrenman", render: (item) => item.trainingSessionTitle ?? "Antrenman" },
                { key: "status", header: "Katılım Durumu", render: (item) => <StatusBadge value={item.status} /> }
              ]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Ödemelerim & Aidat Durumu</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Aidat veya ödeme kaydı bulunamadı."
              items={paymentsQuery.data ?? []}
              columns={[
                { key: "period", header: "Dönem", render: (item) => `${item.month}/${item.year}` },
                { key: "amount", header: "Tutar", render: (item) => `${item.amount} TL` },
                { key: "status", header: "Ödeme Durumu", render: (item) => <StatusBadge value={item.effectiveStatus} /> }
              ]}
            />
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="card-header">
            <strong>Gelişim Raporlarım (Karnelerim)</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Henüz bir gelişim raporu yayınlanmadı."
              items={reportsQuery.data ?? []}
              columns={[
                { key: "summary", header: "Genel Özet", render: (item) => item.summary },
                { key: "improvement", header: "Gelişim Alanları", render: (item) => item.improvementAreas },
                { 
                  key: "scores", 
                  header: "Skorlar", 
                  render: (item) => (
                    <div className="flex gap-4 flex-wrap text-xs">
                      <span className="bg-slate-100 px-2 py-1 rounded">Hız: <strong>{item.speedScore}</strong></span>
                      <span className="bg-slate-100 px-2 py-1 rounded">Güç: <strong>{item.strengthScore}</strong></span>
                      <span className="bg-slate-100 px-2 py-1 rounded">Dripling: <strong>{item.dribblingScore}</strong></span>
                      <span className="bg-slate-100 px-2 py-1 rounded">Şut: <strong>{item.shootingScore}</strong></span>
                    </div>
                  ) 
                },
                { key: "createdAt", header: "Tarih", render: (item) => new Date(item.createdAt).toLocaleDateString("tr-TR") }
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
