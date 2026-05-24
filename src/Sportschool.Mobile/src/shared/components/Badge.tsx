import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

type Tone = "success" | "warning" | "danger" | "neutral";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, toneStyles[tone].badge]}>
      <Text style={[styles.text, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

const toneStyles = {
  success: { badge: { backgroundColor: "rgba(0,109,68,0.12)" }, text: { color: colors.secondary } },
  warning: { badge: { backgroundColor: "#fff7d6" }, text: { color: "#7a5800" } },
  danger: { badge: { backgroundColor: colors.errorContainer }, text: { color: colors.error } },
  neutral: { badge: { backgroundColor: colors.surfaceContainerLow }, text: { color: colors.onSurfaceVariant } }
} as const;

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  text: { ...typography.label },
});
