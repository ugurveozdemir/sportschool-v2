import { z } from "zod";

export const loginSchema = z.object({
  schoolCode: z.string().trim().min(1, "Okul seçimi gerekli."),
  email: z.string().trim().email("Geçerli bir e-posta gir."),
  password: z.string().min(1, "Şifre gerekli.")
});

export type LoginFormValues = z.infer<typeof loginSchema>;
