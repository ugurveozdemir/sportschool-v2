import { useState } from "react";
import { useSession } from "../auth/sessionContext";
import { SchoolDetail } from "./components/SchoolDetail";
import { SchoolList } from "./components/SchoolList";
import type { School } from "./types";

export function PlatformPage() {
  const { session, signOut } = useSession();
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            S
          </div>
          <span className="text-sm font-semibold text-slate-900">Sportschool Platform</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{session?.fullName}</p>
            <p className="text-xs text-slate-400">{session?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Çıkış
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-6 md:grid-cols-[320px_1fr]">
        <div className="h-[calc(100vh-9rem)]">
          <SchoolList selectedSchoolId={selectedSchool?.id ?? null} onSelect={setSelectedSchool} />
        </div>
        <div className="h-[calc(100vh-9rem)]">
          {selectedSchool ? (
            <SchoolDetail schoolId={selectedSchool.id} schoolName={selectedSchool.name} />
          ) : (
            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
              <div>
                <p className="text-sm font-medium text-slate-600">Bir okul seçin</p>
                <p className="mt-1 text-sm text-slate-400">
                  Soldaki listeden bir okula tıklayın; yöneticilerini buradan yönetin.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
