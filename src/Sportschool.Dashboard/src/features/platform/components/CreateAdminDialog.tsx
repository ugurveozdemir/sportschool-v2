import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/api/apiError";
import { Modal } from "../../../shared/components/Modal";
import { createSchoolAdmin } from "../platformApi";

const schema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı."),
  email: z.string().min(1, "E-posta gerekli.").email("Geçerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.")
});

type FormValues = z.infer<typeof schema>;

export function CreateAdminDialog({ schoolId, onClose }: { schoolId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createSchoolAdmin(schoolId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admins", schoolId] });
      onClose();
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
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">Şifre</label>
          <input
            type="text"
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...register("password")}
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          <p className="text-xs text-slate-400">Yöneticiye ileteceğiniz şifreyi siz belirleyin. Sonradan değiştirebilirsiniz.</p>
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
