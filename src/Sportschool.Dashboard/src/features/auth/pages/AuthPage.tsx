import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Navigate } from "react-router-dom";
import { Dumbbell, LockKeyhole, ShieldCheck } from "lucide-react";
import { routes } from "../../../config/routes";
import { storeSession } from "../../../shared/api/sessionStore";
import { getSessionSnapshot } from "../../../shared/api/sessionSubscription";
import { InputField } from "../../../shared/components/FormField";
import { login } from "../api/authApi";
import { loginSchema, type LoginForm } from "../schemas";

export function AuthPage() {
  const session = getSessionSnapshot();
  
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      schoolCode: "",
      email: "",
      password: "",
      mode: "PlatformOwner",
      deviceName: "dashboard"
    }
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: storeSession
  });

  const errorMessage = "Giriş başarısız. Lütfen PlatformOwner e-posta ve şifrenizi kontrol edin.";

  if (session?.roles.includes("PlatformOwner")) {
    return <Navigate to={routes.platform} replace />;
  }

  return (
    <div className="auth-page">
      <section className="auth-shell">
        <div className="auth-intro">
          <div className="auth-logo">
            <Dumbbell size={24} />
          </div>
          <strong className="auth-brand">Sportschool</strong>
          <h1>Platform Yönetim Paneli</h1>
          <p>Spor okulları oluşturun, aktif edin ve okul yöneticilerini tek merkezden atayın.</p>
          <div className="auth-benefits">
            <span><ShieldCheck size={16} /> PlatformOwner güvenli erişimi</span>
            <span><LockKeyhole size={16} /> Bağımsız multi-tenant okul yönetimi</span>
          </div>
        </div>

        <form
          className="auth-panel"
          onSubmit={loginForm.handleSubmit((values) =>
            loginMutation.mutate({
              ...values,
              schoolCode: null,
              deviceName: values.deviceName?.trim() ? values.deviceName.trim() : "dashboard"
            })
          )}
        >
          <div>
            <h2>Giriş Yap</h2>
            <p>Sistem yöneticisi kimlik bilgilerinizi girerek yönetim paneline erişin.</p>
          </div>
          
          <InputField 
            error={loginForm.formState.errors.email?.message} 
            label="E-posta" 
            {...loginForm.register("email")} 
          />
          
          <InputField
            error={loginForm.formState.errors.password?.message}
            label="Şifre"
            type="password"
            {...loginForm.register("password")}
          />
          
          {loginMutation.isError ? <div className="form-error">{errorMessage}</div> : null}
          
          <button className="button button-primary button-block" disabled={loginMutation.isPending} type="submit">
            {loginMutation.isPending ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </section>
    </div>
  );
}
