import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/core/sessionProvider";
import { login, listLoginSchools } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { AkademiLogo } from "@/shared/components/AkademiLogo";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import type { LoginMode } from "@/shared/constants/roles";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: LoginMode }>();
  const mode = params.mode === "Parent" || params.mode === "Coach" ? params.mode : "Athlete";
  const { setSession } = useSession();

  const schoolsQuery = useQuery({ queryKey: ["login-schools"], queryFn: listLoginSchools });
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { schoolCode: "", email: "", password: "" }
  });
  const selectedSchoolCode = form.watch("schoolCode");
  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => login({ ...values, schoolCode: values.schoolCode.trim(), mode, deviceName: "expo-mobile" }),
    onSuccess: async (session) => {
      await setSession(session);
      router.replace("/home");
    },
    onError: () => Alert.alert("Giriş başarısız", "Okul, e-posta, şifre veya rol bilgisini kontrol et.")
  });

  useEffect(() => {
    const firstSchoolCode = schoolsQuery.data?.[0]?.code;
    if (firstSchoolCode && !form.getValues("schoolCode")) {
      form.setValue("schoolCode", firstSchoolCode, { shouldValidate: true });
    }
  }, [form, schoolsQuery.data]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.backgroundLogo}>
        <AkademiLogo size={360} />
      </View>
      <ScrollView alwaysBounceVertical contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <AkademiLogo size={132} />
          <Text style={styles.title}>Akademi Pro</Text>
          <Text style={styles.subtitle}>Profesyonel Kulüp Yönetimi</Text>
        </View>

        <View style={styles.panel}>
          <Controller
            control={form.control}
            name="schoolCode"
            render={({ field, fieldState }) => (
              <View style={styles.schoolPicker}>
                <View style={styles.schoolHeader}>
                  <Text style={styles.fieldLabel}>Okulunu seç</Text>
                  <Text style={styles.helperText}>Giriş yapacağın akademiyi seç.</Text>
                </View>
                {schoolsQuery.isLoading ? <Text style={styles.helperText}>Okullar yükleniyor...</Text> : null}
                {schoolsQuery.isError ? <Text style={styles.errorText}>Okullar listelenemedi. API bağlantısını kontrol et.</Text> : null}
                <View style={styles.schoolList}>
                  {(schoolsQuery.data ?? []).map((school) => {
                    const isSelected = field.value === school.code || selectedSchoolCode === school.code;
                    return (
                      <Pressable key={school.code} onPress={() => field.onChange(school.code)} style={({ pressed }) => [styles.schoolOption, isSelected && styles.schoolOptionSelected, pressed && styles.pressed]}>
                        <View style={styles.schoolOptionContent}>
                          <View style={styles.schoolTextBlock}>
                            <Text style={[styles.schoolName, isSelected && styles.schoolNameSelected]}>{school.name}</Text>
                            <Text style={[styles.schoolCode, isSelected && styles.schoolCodeSelected]}>{school.code}</Text>
                          </View>
                          {isSelected ? <MaterialCommunityIcons name="check-circle" size={24} color={colors.secondaryContainer} /> : <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {schoolsQuery.data?.length === 0 ? <Text style={styles.errorText}>Giriş yapılabilecek okul bulunamadı.</Text> : null}
                {fieldState.error?.message ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
              </View>
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField autoCapitalize="none" error={fieldState.error?.message} keyboardType="email-address" label="E-posta" onBlur={field.onBlur} onChangeText={field.onChange} placeholder="ornek@kulup.com" value={field.value} />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <View style={styles.passwordWrap}>
                <TextField error={fieldState.error?.message} label="Şifre" onBlur={field.onBlur} onChangeText={field.onChange} placeholder="••••••••" secureTextEntry value={field.value} />
                <Text style={styles.forgot}>Şifremi Unuttum</Text>
              </View>
            )}
          />
          <Button disabled={loginMutation.isPending} label={loginMutation.isPending ? "Giriş yapılıyor" : "Giriş Yap  ↪"} onPress={form.handleSubmit((values) => loginMutation.mutate(values))} />
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>veya</Text>
            <View style={styles.divider} />
          </View>
          <Pressable style={styles.clubButton}>
            <MaterialCommunityIcons name="store-plus-outline" size={24} color={colors.primary} />
            <Text style={styles.clubText}>Yeni Kulüp Kaydı</Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace("/role")} style={styles.switchRole}>
          <Text style={styles.switchRoleText}>Rol seçimine dön</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundLogo: { opacity: 0.035, position: "absolute", top: 30 },
  brand: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  clubButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  clubText: { ...typography.headline, color: colors.primary },
  content: { flexGrow: 1, justifyContent: "center", padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  divider: { backgroundColor: colors.outlineVariant, flex: 1, height: 1 },
  dividerRow: { alignItems: "center", flexDirection: "row", gap: spacing.lg, paddingVertical: spacing.sm },
  dividerText: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  errorText: { ...typography.label, color: colors.error },
  fieldLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  forgot: { ...typography.label, alignSelf: "flex-end", color: colors.primary, marginTop: spacing.xs },
  helperText: { ...typography.body, color: colors.onSurfaceVariant },
  panel: { backgroundColor: "rgba(248,249,255,0.88)", borderColor: "rgba(255,255,255,0.7)", borderRadius: radius.xl, borderWidth: 1, gap: spacing.lg, padding: spacing.lg, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { height: 6, width: 0 } },
  passwordWrap: { gap: spacing.xs },
  pressed: { transform: [{ scale: 0.99 }] },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  schoolCode: { ...typography.label, color: colors.onSurfaceVariant },
  schoolCodeSelected: { color: colors.primaryFixedDim },
  schoolHeader: { gap: spacing.xs },
  schoolList: { gap: spacing.sm },
  schoolName: { ...typography.bodyLarge, color: colors.primary },
  schoolNameSelected: { color: colors.onPrimary },
  schoolOption: { backgroundColor: colors.surface, borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  schoolOptionContent: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  schoolOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  schoolPicker: { gap: spacing.xs },
  schoolTextBlock: { flex: 1, gap: 2 },
  subtitle: { ...typography.title, color: colors.onSurfaceVariant, textAlign: "center" },
  switchRole: { alignItems: "center", marginTop: spacing.lg },
  switchRoleText: { ...typography.label, color: colors.primary },
  title: { ...typography.display, color: colors.primary, textAlign: "center" }
});
