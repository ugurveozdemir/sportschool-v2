import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../../shared/api/apiError";
import { useSession } from "./sessionContext";

const loginSchema = z.object({
  email: z.string().min(1, "E-posta gerekli.").email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre gerekli.")
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
        setFormError("E-posta veya şifre hatalı.");
        return;
      }
      setFormError("Giriş yapılamadı. Lütfen tekrar deneyin.");
    }
  });

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Sportschool Platform</h1>
          <p className="mt-1 text-sm text-slate-500">Platform veya okul yöneticisi girişi</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
