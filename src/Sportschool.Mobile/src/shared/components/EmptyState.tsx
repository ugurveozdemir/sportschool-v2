import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="information-outline" size={28} color={colors.outline} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
  description: { ...typography.body, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.title, color: colors.primary, textAlign: "center" }
});
