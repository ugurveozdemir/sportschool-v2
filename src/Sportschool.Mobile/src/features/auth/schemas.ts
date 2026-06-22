import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta gir."),
  password: z.string().min(1, "Şifre gerekli.")
});

export type LoginFormValues = z.infer<typeof loginSchema>;
