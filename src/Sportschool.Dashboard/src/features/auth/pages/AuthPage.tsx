import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate, useLocation } from "react-router-dom";
import { Dumbbell, LockKeyhole, ShieldCheck } from "lucide-react";
import { routes } from "../../../config/routes";
import { storeSession } from "../../../shared/api/sessionStore";
import { getSessionSnapshot } from "../../../shared/api/sessionSubscription";
import { staffLoginModes } from "../../../shared/constants/roles";
import { InputField, SelectField } from "../../../shared/components/FormField";
import { login } from "../api/authApi";
import { loginSchema, type LoginForm } from "../schemas";

export function AuthPage() {
  const session = getSessionSnapshot();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? routes.dashboard;
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      schoolCode: "",
      email: "",
      password: "",
      mode: "Coach",
      deviceName: "dashboard"
    }
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: storeSession
  });

  if (session?.roles.some((role) => role === "Coach" || role === "SchoolAdmin")) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="auth-page">
      <section className="auth-shell">
        <div className="auth-intro">
          <div className="auth-logo">
            <Dumbbell size={24} />
          </div>
          <strong className="auth-brand">Sportschool</strong>
          <h1>Okul operasyon paneli</h1>
          <p>Antrenman, yoklama, ödeme ve gelişim raporlarını tek yerden yönet.</p>
          <div className="auth-benefits">
            <span><ShieldCheck size={16} /> Coach ve SchoolAdmin erişimi</span>
            <span><LockKeyhole size={16} /> Okul kodu ile tenant güvenliği</span>
          </div>
        </div>

        <form
          className="auth-panel"
          onSubmit={loginForm.handleSubmit((values) =>
            loginMutation.mutate({
              ...values,
              schoolCode: values.schoolCode.trim(),
              deviceName: values.deviceName?.trim() ? values.deviceName.trim() : "dashboard"
            })
          )}
        >
          <div>
            <h2>Giriş yap</h2>
            <p>Panel sadece eğitmen ve okul yöneticisi hesapları için açıktır.</p>
          </div>
          <InputField error={loginForm.formState.errors.schoolCode?.message} label="Okul Kodu" {...loginForm.register("schoolCode")} />
          <InputField error={loginForm.formState.errors.email?.message} label="E-posta" {...loginForm.register("email")} />
          <InputField
            error={loginForm.formState.errors.password?.message}
            label="Şifre"
            type="password"
            {...loginForm.register("password")}
          />
          <SelectField error={loginForm.formState.errors.mode?.message} label="Rol" {...loginForm.register("mode")}>
            {staffLoginModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode === "Coach" ? "Eğitmen" : "Okul yöneticisi"}
              </option>
            ))}
          </SelectField>
          {loginMutation.isError ? <div className="form-error">Giriş başarısız. Okul kodu, rol ve şifreyi kontrol et.</div> : null}
          <button className="button button-primary button-block" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </section>
    </div>
  );
}
