import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.outline} style={[styles.input, error && styles.inputError]} {...props} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { ...typography.label, color: colors.error },
  input: {
    ...typography.bodyLarge,
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.onSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  inputError: { borderColor: colors.error },
  label: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  wrap: { gap: spacing.xs }
});
