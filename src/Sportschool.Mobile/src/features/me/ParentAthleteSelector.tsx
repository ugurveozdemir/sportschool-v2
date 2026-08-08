import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { ProfileAvatar, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

export function ParentAthleteSelector() {
  const { session } = useSession();
  const { athletes, isLoading, selectedAthleteProfileId, setSelectedAthleteProfileId } = useAthleteSelection();

  if (session?.loginRole !== "Parent") {
    return null;
  }

  if (isLoading) {
    return (
      <SurfaceCard style={styles.statusCard}>
        <Text style={styles.statusText}>Sporcu bilgileri yükleniyor…</Text>
      </SurfaceCard>
    );
  }

  if (athletes.length === 0) {
    return (
      <SurfaceCard accent="warning" style={styles.statusCard}>
        <Text style={styles.statusTitle}>Bağlı sporcu bulunamadı</Text>
        <Text style={styles.statusText}>Okul yöneticinizden veli hesabınızı sporcu profiline bağlamasını isteyin.</Text>
      </SurfaceCard>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>TAKİP EDİLEN SPORCU</Text>
        {athletes.length > 1 ? <Text style={styles.helper}>Sporcu seçin</Text> : null}
      </View>
      <ScrollView contentContainerStyle={styles.options} horizontal showsHorizontalScrollIndicator={false}>
        {athletes.map((athlete) => {
          const selected = athlete.id === selectedAthleteProfileId;
          const fullName = `${athlete.firstName} ${athlete.lastName}`;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={athlete.id}
              onPress={() => setSelectedAthleteProfileId(athlete.id)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <ProfileAvatar
                label={athlete.firstName.slice(0, 1)}
                size={34}
                tone={selected ? "dark" : "light"}
                uri={athlete.profileImageUrl ? resolveApiUrl(athlete.profileImageUrl) : null}
              />
              <Text numberOfLines={1} style={[styles.name, selected && styles.nameSelected]}>{fullName}</Text>
              {selected ? <MaterialCommunityIcons name="check-circle" size={18} color={colors.onPrimary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function SelectedAthleteAvatar({ fallbackLabel = "S" }: { fallbackLabel?: string }) {
  const { selectedAthlete } = useAthleteSelection();
  return (
    <ProfileAvatar
      label={selectedAthlete?.firstName.slice(0, 1) ?? fallbackLabel}
      size={38}
      tone="dark"
      uri={selectedAthlete?.profileImageUrl ? resolveApiUrl(selectedAthlete.profileImageUrl) : null}
    />
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  heading: { ...typography.label, color: colors.onSurfaceVariant },
  headingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  helper: { ...typography.body, color: colors.primaryContainer },
  name: { ...typography.label, color: colors.onSurface, flexShrink: 1 },
  nameSelected: { color: colors.onPrimary },
  option: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    maxWidth: 220,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  optionSelected: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  options: { gap: spacing.sm },
  statusCard: { gap: spacing.xs },
  statusText: { ...typography.body, color: colors.onSurfaceVariant },
  statusTitle: { ...typography.title, color: colors.primary }
});
