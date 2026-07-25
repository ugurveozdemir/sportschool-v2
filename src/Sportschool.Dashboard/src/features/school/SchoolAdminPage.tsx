import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSession } from "../auth/sessionContext";
import { AthleteMediaDialog } from "./components/AthleteMediaDialog";
import { listAthletes } from "./schoolApi";
import type { Athlete } from "./types";

export function SchoolAdminPage() {
  const { session, signOut } = useSession();
  const [search, setSearch] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const athletesQuery = useQuery({ queryKey: ["school", "athletes"], queryFn: () => listAthletes() });
  const athletes = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
    if (!normalizedSearch) return athletesQuery.data ?? [];
    return (athletesQuery.data ?? []).filter((athlete) =>
      `${athlete.firstName} ${athlete.lastName}`.toLocaleLowerCase("tr-TR").includes(normalizedSearch)
    );
  }, [athletesQuery.data, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">S</div>
          <span className="text-sm font-semibold text-slate-900">Sportschool Yönetim</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{session?.fullName}</p>
            <p className="text-xs text-slate-400">Okul yöneticisi</p>
          </div>
          <button type="button" onClick={() => void signOut()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sporcu medyası</h1>
            <p className="mt-1 text-sm text-slate-500">Profil fotoğraflarını ve okul içi feed videolarını yönetin.</p>
          </div>
          <label className="w-full sm:w-72">
            <span className="sr-only">Sporcu ara</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sporcu ara" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>

        {athletesQuery.isLoading && <p className="text-sm text-slate-400">Sporcular yükleniyor…</p>}
        {athletesQuery.isError && <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">Sporcular yüklenemedi. Lütfen tekrar deneyin.</p>}
        {!athletesQuery.isLoading && athletes.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Bu aramaya uygun sporcu bulunamadı.</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} onManage={() => setSelectedAthlete(athlete)} />)}
        </div>
      </main>

      {selectedAthlete && <AthleteMediaDialog athlete={selectedAthlete} onClose={() => setSelectedAthlete(null)} />}
    </div>
  );
}

function AthleteCard({ athlete, onManage }: { athlete: Athlete; onManage: () => void }) {
  const initials = `${athlete.firstName[0] ?? ""}${athlete.lastName[0] ?? ""}`.toUpperCase();
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {athlete.profileImageUrl ? <img src={athlete.profileImageUrl} alt="" className="size-12 rounded-full object-cover" /> : <div className="grid size-12 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">{initials}</div>}
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-slate-900">{athlete.firstName} {athlete.lastName}</h2>
        <p className="truncate text-xs text-slate-500">Veli: {athlete.parentFullName}</p>
      </div>
      <button type="button" onClick={onManage} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Yönet</button>
    </article>
  );
}
