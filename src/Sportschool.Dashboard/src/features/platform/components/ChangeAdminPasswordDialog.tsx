import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../../../shared/components/Modal";
import { updateSchoolAdminPassword } from "../platformApi";
import type { SchoolAdmin } from "../types";

const schema = z.object({
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.")
});

type FormValues = z.infer<typeof schema>;

export function ChangeAdminPasswordDialog({
  admin,
  onClose
}: {
  admin: SchoolAdmin;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateSchoolAdminPassword(admin.schoolId, admin.id, values.password),
    onSuccess: onClose
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch {
      setError("root", { message: "Şifre değiştirilemedi." });
    }
  });

  return (
    <Modal title="Şifre değiştir" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{admin.fullName}</span> ({admin.email}) için yeni
          bir şifre belirleyin. Yöneticinin açık oturumları kapanır ve yeni şifreyle giriş yapması gerekir.
        </p>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Yeni şifre</label>
          <input
            type="text"
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
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
            {isSubmitting ? "Kaydediliyor…" : "Şifreyi değiştir"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
