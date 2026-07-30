import { zodResolver } from "@hookform/resolvers/zod";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/core/sessionProvider";
import { login } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas";
import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { brand } from "@/shared/constants/brand";
import type { LoginMode } from "@/shared/constants/roles";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { fontFamily, typography } from "@/shared/design/typography";

type MobileLoginMode = "Athlete" | "Coach" | "Parent";

const backgrounds: Record<MobileLoginMode, ImageSourcePropType> = {
  Athlete: require("../../assets/role-athletes.png"),
  Coach: require("../../assets/role-coaches.png"),
  Parent: require("../../assets/role-parents.png")
};

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: LoginMode }>();
  const mode = params.mode === "Parent" || params.mode === "Coach" ? params.mode : "Athlete";
  const { setSession } = useSession();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });
  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) => login({ ...values, mode, deviceName: "expo-mobile" }),
    onSuccess: async (session) => {
      await setSession(session);
      router.replace("/home");
    },
    onError: () => Alert.alert("Giriş başarısız", "E-posta, şifre veya rol bilgisini kontrol et.")
  });

  return (
    <ImageBackground source={backgrounds[mode]} style={styles.background}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          alwaysBounceVertical
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoCircle}>
              <AcademyLogoAvatar size={116} />
            </View>
            <Text style={styles.brandName}>{brand.name}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Giriş Yap</Text>
            <Text style={styles.roleLabel}>{getRoleLabel(mode)}</Text>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <View style={styles.fieldWrap}>
                  <View style={[styles.field, fieldState.error && styles.fieldError]}>
                    <MaterialCommunityIcons name="account-outline" size={26} color={colors.onSurfaceVariant} />
                    <View style={styles.fieldInputWrap}>
                      <Text style={styles.fieldLabel}>E-posta</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        placeholder="ornek@kulup.com"
                        placeholderTextColor={colors.outline}
                        style={styles.input}
                        value={field.value}
                      />
                    </View>
                  </View>
                  {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
                </View>
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <View style={styles.fieldWrap}>
                  <View style={[styles.field, fieldState.error && styles.fieldError]}>
                    <MaterialCommunityIcons name="key-outline" size={27} color={colors.onSurfaceVariant} />
                    <View style={styles.fieldInputWrap}>
                      <Text style={styles.fieldLabel}>Şifre</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="current-password"
                        onBlur={field.onBlur}
                        onChangeText={field.onChange}
                        placeholder="••••••••"
                        placeholderTextColor={colors.outline}
                        secureTextEntry={!passwordVisible}
                        style={styles.input}
                        value={field.value}
                      />
                    </View>
                    <Pressable
                      accessibilityLabel={passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
                      hitSlop={10}
                      onPress={() => setPasswordVisible((current) => !current)}
                    >
                      <MaterialCommunityIcons
                        name={passwordVisible ? "eye-off-outline" : "eye-outline"}
                        size={28}
                        color={colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                  {fieldState.error ? <Text style={styles.errorText}>{fieldState.error.message}</Text> : null}
                </View>
              )}
            />

            <Pressable
              disabled={loginMutation.isPending}
              onPress={form.handleSubmit((values) => loginMutation.mutate(values))}
              style={({ pressed }) => [
                styles.loginButton,
                loginMutation.isPending && styles.disabled,
                pressed && !loginMutation.isPending && styles.pressed
              ]}
            >
              <Text style={styles.loginButtonText}>{loginMutation.isPending ? "GİRİŞ YAPILIYOR" : "GİRİŞ YAP"}</Text>
              <MaterialCommunityIcons name="arrow-right" size={30} color={colors.onPrimary} />
            </Pressable>

            <Pressable onPress={() => router.replace("/role")} style={styles.switchRole}>
              <MaterialCommunityIcons name="account-switch-outline" size={20} color={colors.primaryContainer} />
              <Text style={styles.switchRoleText}>Rol seçimine dön</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function getRoleLabel(mode: MobileLoginMode) {
  if (mode === "Coach") {
    return "ANTRENÖR GİRİŞİ";
  }
  if (mode === "Parent") {
    return "VELİ GİRİŞİ";
  }
  return "SPORCU GİRİŞİ";
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.background, flex: 1 },
  brand: { alignItems: "center", gap: spacing.md },
  brandName: {
    color: colors.onSurface,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 37,
    textAlign: "center"
  },
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2
  },
  disabled: { opacity: 0.55 },
  errorText: { ...typography.label, color: colors.error, paddingHorizontal: spacing.xs },
  field: {
    alignItems: "center",
    backgroundColor: "rgba(31,31,34,0.96)",
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 74,
    paddingHorizontal: spacing.md
  },
  fieldError: { borderColor: colors.error },
  fieldInputWrap: { flex: 1, justifyContent: "center" },
  fieldLabel: { ...typography.body, color: colors.onSurfaceVariant },
  fieldWrap: { gap: spacing.xs },
  form: { gap: spacing.md },
  input: {
    ...typography.bodyLarge,
    color: colors.onSurface,
    minHeight: 30,
    padding: 0
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginTop: spacing.sm,
    minHeight: 64
  },
  loginButtonText: {
    color: colors.onPrimary,
    fontFamily: fontFamily.headingBold,
    fontSize: 22,
    letterSpacing: 1.3
  },
  logoCircle: {
    alignItems: "center",
    backgroundColor: "rgba(14,14,17,0.88)",
    borderColor: colors.surfaceVariant,
    borderRadius: radius.full,
    borderWidth: 4,
    height: 140,
    justifyContent: "center",
    width: 140
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(14,14,17,0.88)"
  },
  pressed: { transform: [{ scale: 0.98 }] },
  roleLabel: {
    ...typography.label,
    color: colors.primaryContainer,
    textAlign: "center"
  },
  safeArea: { flex: 1 },
  switchRole: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm
  },
  switchRoleText: { ...typography.body, color: colors.primaryContainer },
  title: {
    ...typography.display,
    color: colors.onSurface,
    fontSize: 36,
    lineHeight: 44,
    textAlign: "center"
  }
});
