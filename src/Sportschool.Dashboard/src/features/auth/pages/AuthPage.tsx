import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { endpoints } from "../../../shared/constants/endpoints";
import { loginModes } from "../../../shared/constants/roles";
import { storeSession } from "../../../shared/api/sessionStore";
import { EndpointCard } from "../../../shared/components/EndpointCard";
import { InputField, SelectField } from "../../../shared/components/FormField";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponseInspector } from "../../../shared/components/ResponseInspector";
import { bootstrapPlatformOwner, changePassword, login } from "../api/authApi";
import {
  bootstrapPlatformOwnerSchema,
  changePasswordSchema,
  loginSchema,
  type BootstrapPlatformOwnerForm,
  type ChangePasswordForm,
  type LoginForm
} from "../schemas";
import { SessionSummary } from "../components/SessionSummary";

export function AuthPage() {
  const bootstrapForm = useForm<BootstrapPlatformOwnerForm>({
    resolver: zodResolver(bootstrapPlatformOwnerSchema),
    defaultValues: {
      email: "owner@example.com",
      fullName: "Platform Owner",
      password: "change-me"
    }
  });
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      schoolCode: "",
      email: "owner@example.com",
      password: "change-me",
      mode: "PlatformOwner",
      deviceName: "dashboard"
    }
  });
  const passwordForm = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: ""
    }
  });

  const bootstrapMutation = useMutation({
    mutationFn: bootstrapPlatformOwner
  });
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: storeSession
  });
  const changePasswordMutation = useMutation({
    mutationFn: changePassword
  });

  return (
    <div>
      <PageHeader
        title="Kimlik İşlemleri"
        description="Platform bootstrap, giriş, token yenileme ve şifre değiştirme işlemleri."
      />

      <div className="page-grid">
        <div style={{ display: "grid", gap: 20 }}>
          <EndpointCard
            isSubmitting={bootstrapMutation.isPending}
            method="POST"
            onSubmit={bootstrapForm.handleSubmit((values) => bootstrapMutation.mutate(values))}
            path={endpoints.bootstrapPlatformOwner}
            title="Development bootstrap"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InputField
                error={bootstrapForm.formState.errors.email?.message}
                label="E-posta"
                {...bootstrapForm.register("email")}
              />
              <InputField
                error={bootstrapForm.formState.errors.fullName?.message}
                label="Ad Soyad"
                {...bootstrapForm.register("fullName")}
              />
              <InputField
                error={bootstrapForm.formState.errors.password?.message}
                label="Şifre"
                type="password"
                {...bootstrapForm.register("password")}
              />
            </div>
          </EndpointCard>

          <EndpointCard
            isSubmitting={loginMutation.isPending}
            method="POST"
            onSubmit={loginForm.handleSubmit((values) =>
              loginMutation.mutate({
                ...values,
                schoolCode: values.schoolCode?.trim() ? values.schoolCode.trim() : null,
                deviceName: values.deviceName?.trim() ? values.deviceName.trim() : null
              })
            )}
            path={endpoints.login}
            title="Oturum aç"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InputField error={loginForm.formState.errors.email?.message} label="E-posta" {...loginForm.register("email")} />
              <InputField
                error={loginForm.formState.errors.password?.message}
                label="Şifre"
                type="password"
                {...loginForm.register("password")}
              />
              <InputField label="Okul Kodu" placeholder="SchoolAdmin/Coach/Parent/Athlete için" {...loginForm.register("schoolCode")} />
              <SelectField error={loginForm.formState.errors.mode?.message} label="Giriş Modu" {...loginForm.register("mode")}>
                {loginModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </SelectField>
              <InputField label="Cihaz Adı" {...loginForm.register("deviceName")} />
            </div>
          </EndpointCard>

          <EndpointCard
            isSubmitting={changePasswordMutation.isPending}
            method="POST"
            onSubmit={passwordForm.handleSubmit((values) => changePasswordMutation.mutate(values))}
            path={endpoints.changePassword}
            title="Şifre değiştir"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
            </div>
          </EndpointCard>

          <SessionSummary />
        </div>

        <ResponseInspector />
      </div>
    </div>
  );
}
