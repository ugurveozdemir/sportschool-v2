import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/shared/components/AppScreen";
import { Card } from "@/shared/components/Card";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import type { LoginMode } from "@/shared/constants/roles";

const roles: { mode: LoginMode; title: string; description: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { mode: "Athlete", title: "Sporcu", description: "Antrenman, yoklama ve gelişim durumunu takip et.", icon: "run-fast" },
  { mode: "Parent", title: "Veli", description: "Çocuğunun program, ödeme ve raporlarını görüntüle.", icon: "account-child" }
];

export default function RoleScreen() {
  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <MaterialCommunityIcons name="soccer" size={42} color={colors.onPrimary} />
        </View>
        <Text style={styles.title}>Akademi Pro</Text>
        <Text style={styles.subtitle}>Profesyonel kulüp deneyimine hoş geldin.</Text>
      </View>

      <View style={styles.stack}>
        {roles.map((role) => (
          <Pressable key={role.mode} onPress={() => router.push({ pathname: "/login", params: { mode: role.mode } })}>
            <Card style={styles.roleCard}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={role.icon} size={28} color={colors.primary} />
              </View>
              <View style={styles.roleText}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} />
            </Card>
          </Pressable>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl, marginTop: spacing.xl },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 88,
    justifyContent: "center",
    width: 88
  },
  roleCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  roleDescription: { ...typography.body, color: colors.onSurfaceVariant },
  roleText: { flex: 1, gap: 4 },
  roleTitle: { ...typography.title, color: colors.primary },
  stack: { gap: spacing.md },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.display, color: colors.primary, textAlign: "center" },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    height: 52,
    justifyContent: "center",
    width: 52
  }
});
