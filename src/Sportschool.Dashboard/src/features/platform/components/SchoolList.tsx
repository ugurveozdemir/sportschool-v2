import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { deactivateSchool, listSchools } from "../platformApi";
import type { School } from "../types";
import { CreateSchoolDialog } from "./CreateSchoolDialog";

type SchoolListProps = {
  selectedSchoolId: string | null;
  onSelect: (school: School) => void;
};

export function SchoolList({ selectedSchoolId, onSelect }: SchoolListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<School | null>(null);

  const schoolsQuery = useQuery({
    queryKey: ["schools", search],
    queryFn: () => listSchools(search)
  });

  const deactivateMutation = useMutation({
    mutationFn: (schoolId: string) => deactivateSchool(schoolId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schools"] });
      setPendingDeactivate(null);
    }
  });

  const schools = schoolsQuery.data ?? [];

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Okullar</h2>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          + Okul ekle
        </button>
      </div>

      <div className="p-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ada veya koda göre ara…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {schoolsQuery.isLoading && <p className="px-2 py-4 text-sm text-slate-400">Yükleniyor…</p>}
        {schoolsQuery.isError && (
          <p className="px-2 py-4 text-sm text-red-600">Okullar yüklenemedi.</p>
        )}
        {!schoolsQuery.isLoading && schools.length === 0 && (
          <p className="px-2 py-4 text-sm text-slate-400">Kayıtlı okul yok.</p>
        )}

        <ul className="space-y-1">
          {schools.map((school) => {
            const isSelected = school.id === selectedSchoolId;
            return (
              <li key={school.id}>
                <div
                  className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
                    isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(school)}
                    className="flex min-w-0 flex-1 flex-col text-left"
                  >
                    <span className="truncate text-sm font-medium text-slate-900">{school.name}</span>
                    <span className="truncate text-xs text-slate-400">{school.code}</span>
                  </button>
                  {school.isActive ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Pasif
                    </span>
                  )}
                  {school.isActive && (
                    <button
                      type="button"
                      onClick={() => setPendingDeactivate(school)}
                      title="Okulu pasifleştir"
                      className="rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    >
                      Çıkar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {showCreate && <CreateSchoolDialog onClose={() => setShowCreate(false)} />}

      {pendingDeactivate && (
        <ConfirmDialog
          title="Okulu pasifleştir"
          message={`"${pendingDeactivate.name}" pasifleştirilecek. Giriş ve erişim kapanır, veriler korunur.`}
          confirmLabel="Pasifleştir"
          busy={deactivateMutation.isPending}
          onConfirm={() => deactivateMutation.mutate(pendingDeactivate.id)}
          onCancel={() => setPendingDeactivate(null)}
        />
      )}
    </aside>
  );
}
