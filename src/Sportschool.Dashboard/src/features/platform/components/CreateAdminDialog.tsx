import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/api/apiError";
import { Modal } from "../../../shared/components/Modal";
import { createSchoolAdmin } from "../platformApi";
import type { CreatedSchoolAdmin } from "../types";

const schema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı."),
  email: z.string().min(1, "E-posta gerekli.").email("Geçerli bir e-posta girin.")
});

type FormValues = z.infer<typeof schema>;

export function CreateAdminDialog({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [created, setCreated] = useState<CreatedSchoolAdmin | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createSchoolAdmin(schoolId, values),
    onSuccess: async (admin) => {
      await queryClient.invalidateQueries({ queryKey: ["admins", schoolId] });
      setCreated(admin);
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("email", { message: "Bu e-posta bu okulda zaten kayıtlı." });
        return;
      }
      setError("root", { message: "Yönetici eklenemedi." });
    }
  });

  if (created) {
    return (
      <Modal title="Yönetici eklendi" onClose={onClose}>
        <TemporaryPasswordPanel admin={created} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal title="Yeni yönetici ekle" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Ad soyad</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("fullName")}
          />
          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">E-posta</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("email")}
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? "Ekleniyor…" : "Yönetici ekle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TemporaryPasswordPanel({ admin, onClose }: { admin: CreatedSchoolAdmin; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(admin.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-900">{admin.fullName}</span> ({admin.email}) için geçici şifre
        oluşturuldu. Bu şifre <span className="font-semibold">yalnızca bir kez</span> gösterilir — kopyalayıp
        yöneticiye iletin.
      </p>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <code className="font-mono text-base font-semibold text-slate-900">{admin.temporaryPassword}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
        >
          {copied ? "Kopyalandı ✓" : "Kopyala"}
        </button>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
