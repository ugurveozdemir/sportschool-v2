import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "../../../shared/components/ConfirmDialog";
import { listSchoolAdmins, removeSchoolAdmin } from "../platformApi";
import type { SchoolAdmin } from "../types";
import { CreateAdminDialog } from "./CreateAdminDialog";

export function SchoolDetail({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<SchoolAdmin | null>(null);

  const adminsQuery = useQuery({
    queryKey: ["admins", schoolId],
    queryFn: () => listSchoolAdmins(schoolId)
  });

  const removeMutation = useMutation({
    mutationFn: (adminId: string) => removeSchoolAdmin(schoolId, adminId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admins", schoolId] });
      setPendingRemove(null);
    }
  });

  const admins = adminsQuery.data ?? [];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900">{schoolName}</h2>
          <p className="text-xs text-slate-400">Okul yöneticileri</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          + Yönetici ekle
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {adminsQuery.isLoading && <p className="text-sm text-slate-400">Yükleniyor…</p>}
        {adminsQuery.isError && <p className="text-sm text-red-600">Yöneticiler yüklenemedi.</p>}
        {!adminsQuery.isLoading && admins.length === 0 && (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm text-slate-500">Bu okula henüz yönetici eklenmemiş.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
            >
              İlk yöneticiyi ekle
            </button>
          </div>
        )}

        <ul className="space-y-2">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{admin.fullName}</p>
                <p className="truncate text-xs text-slate-500">{admin.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingRemove(admin)}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-red-300 hover:text-red-600"
              >
                Çıkar
              </button>
            </li>
          ))}
        </ul>
      </div>

      {showCreate && <CreateAdminDialog schoolId={schoolId} onClose={() => setShowCreate(false)} />}

      {pendingRemove && (
        <ConfirmDialog
          title="Yöneticiyi çıkar"
          message={`"${pendingRemove.fullName}" bu okulun yöneticiliğinden çıkarılacak ve giriş erişimi kapanacak.`}
          confirmLabel="Çıkar"
          busy={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(pendingRemove.id)}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </section>
  );
}
