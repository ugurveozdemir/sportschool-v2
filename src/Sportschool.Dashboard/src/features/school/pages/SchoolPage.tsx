import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable } from "../../../shared/components/DataTable";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { createCoach, listAthletes, listCoaches, listUsers } from "../api/schoolApi";

export function SchoolPage() {
  const [coach, setCoach] = useState({ email: "", fullName: "" });
  const usersQuery = useQuery({ queryKey: ["school", "users"], queryFn: listUsers });
  const coachesQuery = useQuery({ queryKey: ["school", "coaches"], queryFn: listCoaches });
  const athletesQuery = useQuery({ queryKey: ["school", "athletes"], queryFn: () => listAthletes() });
  
  const createCoachMutation = useMutation({
    mutationFn: createCoach,
    onSuccess: () => {
      setCoach({ email: "", fullName: "" });
      void coachesQuery.refetch();
      void usersQuery.refetch();
    }
  });

  return (
    <div>
      <PageHeader title="Okul Yönetimi" description="Okulunuzdaki eğitmenleri, personelleri ve tüm aktif sporcu kadrosunu yönetin." />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <section className="card lg:col-span-2">
          <div className="card-header">
            <strong>Okul Personelleri & Yetkililer</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Kullanıcı bulunamadı."
              items={usersQuery.data ?? []}
              columns={[
                { key: "fullName", header: "Ad Soyad", render: (item) => item.fullName },
                { key: "email", header: "E-posta", render: (item) => item.email },
                { 
                  key: "roles", 
                  header: "Roller", 
                  render: (item) => (
                    <span className="bg-slate-100 text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {item.roles.join(", ")}
                    </span>
                  ) 
                }
              ]}
            />
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Yeni Antrenör Ekle</strong>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              createCoachMutation.mutate(coach);
            }} className="stack">
              <InputField 
                label="Ad Soyad" 
                onChange={(e) => setCoach({ ...coach, fullName: e.target.value })} 
                value={coach.fullName} 
                required 
              />
              <InputField 
                label="E-posta" 
                type="email"
                onChange={(e) => setCoach({ ...coach, email: e.target.value })} 
                value={coach.email} 
                required 
              />
              <button 
                type="submit" 
                className="button button-primary w-full justify-center mt-4"
                disabled={createCoachMutation.isPending}
              >
                {createCoachMutation.isPending ? "Ekleniyor..." : "Antrenör Oluştur"}
              </button>
            </form>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card">
          <div className="card-header">
            <strong>Eğitmenler (Coaches)</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Kayıtlı eğitmen bulunamadı."
              items={coachesQuery.data ?? []}
              columns={[
                { key: "fullName", header: "Eğitmen", render: (item) => item.fullName },
                { key: "email", header: "E-posta", render: (item) => item.email }
              ]}
            />
          </div>
        </section>

        <section className="card lg:col-span-2">
          <div className="card-header">
            <strong>Okul Sporcu Rosterı</strong>
          </div>
          <div className="card-body">
            <DataTable
              emptyText="Kayıtlı aktif sporcu bulunamadı."
              items={athletesQuery.data ?? []}
              columns={[
                { key: "name", header: "Sporcu", render: (item) => `${item.firstName} ${item.lastName}` },
                { key: "birthDate", header: "Doğum Tarihi", render: (item) => new Date(item.birthDate).toLocaleDateString("tr-TR") },
                { key: "parent", header: "Veli Adı Soyadı", render: (item) => item.parentFullName },
                { key: "phone", header: "Veli İletişim", render: (item) => item.parentPhone }
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
