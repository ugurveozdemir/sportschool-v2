import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

type ErrorStateProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Button label="Tekrar dene" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center", padding: spacing.xl },
  description: { ...typography.body, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.title, color: colors.primary, textAlign: "center" }
});
