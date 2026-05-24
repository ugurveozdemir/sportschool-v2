import { z } from "zod";
import { staffLoginModes } from "../../shared/constants/roles";

export const bootstrapPlatformOwnerSchema = z.object({
  email: z.email("Geçerli bir e-posta gir."),
  fullName: z.string().min(2, "Ad soyad gerekli."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı.")
});

export const loginSchema = z.object({
  schoolCode: z.string().min(1, "Okul kodu gerekli."),
  email: z.email("Geçerli bir e-posta gir."),
  password: z.string().min(1, "Şifre gerekli."),
  mode: z.enum(staffLoginModes),
  deviceName: z.string().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gerekli."),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı.")
});

export type BootstrapPlatformOwnerForm = z.infer<typeof bootstrapPlatformOwnerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type ChangePasswordForm = z.infer<typeof changePasswordSchema>;
