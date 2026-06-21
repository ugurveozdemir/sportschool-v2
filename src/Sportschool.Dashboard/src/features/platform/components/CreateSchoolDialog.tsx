import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../../shared/api/apiError";
import { Modal } from "../../../shared/components/Modal";
import { createSchool } from "../platformApi";

const schema = z.object({
  name: z.string().min(2, "Okul adı en az 2 karakter olmalı."),
  code: z
    .string()
    .min(2, "Okul kodu en az 2 karakter olmalı.")
    .regex(/^[a-zA-Z0-9-]+$/, "Kod yalnızca harf, rakam ve tire içerebilir.")
});

type FormValues = z.infer<typeof schema>;

export function CreateSchoolDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "" }
  });

  const mutation = useMutation({
    mutationFn: createSchool,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["schools"] });
      onClose();
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError("code", { message: "Bu kod zaten kullanımda." });
        return;
      }
      setError("root", { message: "Okul oluşturulamadı." });
    }
  });

  return (
    <Modal title="Yeni okul ekle" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Okul adı" error={errors.name?.message}>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Örn. Ata Spor Kulübü"
            {...register("name")}
          />
        </Field>
        <Field label="Okul kodu" error={errors.code?.message} hint="Giriş ekranında kullanılır, benzersiz olmalı.">
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="ör. ata-spor"
            {...register("code")}
          />
        </Field>

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
            {isSubmitting ? "Ekleniyor…" : "Okul ekle"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
