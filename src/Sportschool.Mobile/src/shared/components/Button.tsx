import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
};

export function Button({ label, onPress, disabled, variant = "primary" }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.primary : styles.outline,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.primaryLabel : styles.outlineLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: radius.sm, justifyContent: "center", minHeight: 52, padding: spacing.md },
  disabled: { opacity: 0.55 },
  label: { ...typography.title },
  outline: { backgroundColor: "transparent", borderColor: colors.primary, borderWidth: 2 },
  outlineLabel: { color: colors.primary },
  pressed: { transform: [{ scale: 0.98 }] },
  primary: { backgroundColor: colors.primaryContainer },
  primaryLabel: { color: colors.onPrimary }
});
