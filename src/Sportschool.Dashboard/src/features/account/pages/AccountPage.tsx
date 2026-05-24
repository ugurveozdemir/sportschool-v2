import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { clearStoredSession } from "../../../shared/api/sessionStore";
import { getSessionSnapshot, subscribeToSession } from "../../../shared/api/sessionSubscription";
import { InputField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { changePassword } from "../../auth/api/authApi";
import { changePasswordSchema, type ChangePasswordForm } from "../../auth/schemas";

export function AccountPage() {
  const session = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getSessionSnapshot);
  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" }
  });
  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => passwordForm.reset()
  });

  return (
    <div>
      <PageHeader title="Hesap" description="Oturum bilgileri ve şifre işlemleri." />
      <div className="content-grid">
        <section className="card">
          <div className="card-header">
            <strong>Oturum</strong>
          </div>
          <div className="card-body stack">
            <div className="info-row"><span>Ad Soyad</span><strong>{session?.fullName}</strong></div>
            <div className="info-row"><span>E-posta</span><strong>{session?.email}</strong></div>
            <div className="info-row"><span>Rol</span><strong>{session?.roles[0]}</strong></div>
            <button className="button button-danger" onClick={clearStoredSession} type="button">Çıkış yap</button>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <strong>Şifre değiştir</strong>
          </div>
          <form
            className="card-body stack"
            onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
          >
            <InputField
              error={passwordForm.formState.errors.currentPassword?.message}
              label="Mevcut Şifre"
              type="password"
              {...passwordForm.register("currentPassword")}
            />
            <InputField
              error={passwordForm.formState.errors.newPassword?.message}
              label="Yeni Şifre"
              type="password"
              {...passwordForm.register("newPassword")}
            />
            {passwordMutation.isSuccess ? <div className="form-success">Şifre güncellendi.</div> : null}
            {passwordMutation.isError ? <div className="form-error">Şifre güncellenemedi.</div> : null}
            <button className="button button-primary" disabled={passwordMutation.isPending} type="submit">
              {passwordMutation.isPending ? "Kaydediliyor..." : "Şifreyi güncelle"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
