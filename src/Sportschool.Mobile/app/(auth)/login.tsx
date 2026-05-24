import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/app/sessionProvider";
import { login, listLoginSchools } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import type { LoginMode } from "@/shared/constants/roles";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: LoginMode }>();
  const mode = params.mode === "Parent" ? "Parent" : "Athlete";
  const { setSession } = useSession();

  const schoolsQuery = useQuery({ queryKey: ["login-schools"], queryFn: listLoginSchools });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { schoolCode: "", email: "", password: "" }
  });
  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      login({ ...values, schoolCode: values.schoolCode.trim(), mode, deviceName: "expo-mobile" }),
    onSuccess: async (session) => {
      await setSession(session);
      router.replace("/(app)/home");
    },
    onError: () => Alert.alert("Giriş başarısız", "Okul kodu, e-posta, şifre veya rol bilgisini kontrol et.")
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{mode === "Parent" ? "Veli Girişi" : "Sporcu Girişi"}</Text>
        <Text style={styles.title}>Akademi hesabına giriş yap</Text>
        <Text style={styles.subtitle}>Okul kodunu ve kullanıcı bilgilerini girerek devam et.</Text>
      </View>

      <Card style={styles.card}>
        <Controller
          control={form.control}
          name="schoolCode"
          render={({ field, fieldState }) => (
            <TextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              label="Okul kodu"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder={schoolsQuery.data?.[0]?.code ?? "demo"}
              value={field.value}
            />
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <TextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              keyboardType="email-address"
              label="E-posta"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="ornek@kulup.com"
              value={field.value}
            />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <TextField
              error={fieldState.error?.message}
              label="Şifre"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="••••••••"
              secureTextEntry
              value={field.value}
            />
          )}
        />
        <Button
          disabled={loginMutation.isPending}
          label={loginMutation.isPending ? "Giriş yapılıyor" : "Giriş Yap"}
          onPress={form.handleSubmit((values) => loginMutation.mutate(values))}
        />
      </Card>

      <Pressable onPress={() => router.replace("/(auth)/role")} style={styles.switchRole}>
        <Text style={styles.switchRoleText}>Rol seçimine dön</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  container: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  kicker: { ...typography.label, color: colors.secondary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  switchRole: { alignItems: "center", marginTop: spacing.lg },
  switchRoleText: { ...typography.label, color: colors.primary },
  title: { ...typography.display, color: colors.primary }
});
