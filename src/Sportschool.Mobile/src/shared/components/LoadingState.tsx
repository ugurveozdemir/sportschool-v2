import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

export function LoadingState({ label = "Yükleniyor" }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center" },
  text: { ...typography.body, color: colors.onSurfaceVariant }
});
