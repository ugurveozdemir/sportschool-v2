import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachAttendanceRoster } from "@/features/coach/api";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatTime } from "@/shared/utils/date";

export default function TrainingDetailScreen() {
  const { session } = useSession();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const rosterQuery = useCoachAttendanceRoster(isCoach ? trainingId : undefined);

  if (!isCoach) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.card}>
          <Text style={styles.headingText}>Antrenman bulunamadı</Text>
          <Text style={styles.mutedText}>Bu detay ekranı şu an sadece koç hesapları için açık.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (rosterQuery.isLoading) {
    return <LoadingState label="Antrenman yükleniyor" />;
  }

  if (!rosterQuery.data) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.card}>
          <Text style={styles.headingText}>Antrenman bulunamadı</Text>
          <Text style={styles.mutedText}>Bu antrenman silinmiş olabilir veya erişim yetkin olmayabilir.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const { training, athletes } = rosterQuery.data;
  const notes = training.notes?.trim();

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Antrenman Detayı</Text>
          <Text style={styles.headingText}>{training.title}</Text>
          <Text style={styles.mutedText}>{formatTrainingDate(training.startsAt)} · {formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
        </View>
      </View>

      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="soccer-field" size={28} color={colors.secondary} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.sectionLabel}>Konum</Text>
            <Text style={styles.primaryText}>{training.location ?? "Konum girilmedi"}</Text>
          </View>
        </View>
        <View style={styles.pillRow}>
          <Pill label={`${training.groups.length} grup`} tone="primary" icon="account-group-outline" />
          <Pill label={`${athletes.length} sporcu`} tone="success" icon="account-multiple-outline" />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Açıklama" />
        <Text style={notes ? styles.bodyText : styles.mutedText}>{notes || "Bu antrenman için açıklama eklenmemiş."}</Text>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Katılan Gruplar" />
        <View style={styles.groupList}>
          {training.groups.map((group) => (
            <View key={group.id} style={styles.groupRow}>
              <MaterialCommunityIcons name="account-group-outline" size={20} color={colors.primary} />
              <Text style={styles.primaryText}>{group.name}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Oyuncular" />
        {athletes.length === 0 ? (
          <EmptyState title="Oyuncu yok" description="Bu antrenmana bağlı gruplarda aktif oyuncu bulunmuyor." />
        ) : (
          <View style={styles.athleteList}>
            {athletes.map((athlete) => (
              <View key={athlete.athleteProfileId} style={styles.athleteRow}>
                <InitialsAvatar label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={42} tone="dark" />
                <View style={styles.flexOne}>
                  <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                  <Text style={styles.athleteMeta}>Veli: {athlete.parentFullName}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </SurfaceCard>
    </ScreenShell>
  );
}

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(new Date(value));
}

const styles = StyleSheet.create({
  athleteList: { gap: spacing.sm },
  athleteMeta: { ...typography.body, color: colors.onSurfaceVariant },
  athleteName: { ...typography.bodyLarge, color: colors.primary, fontFamily: "Inter_700Bold" },
  athleteRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  bodyText: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
  card: { gap: spacing.md },
  detailHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  eyebrow: { ...typography.label, color: colors.secondary, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  groupList: { gap: spacing.sm },
  groupRow: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  headingText: { ...typography.headline, color: colors.primary },
  mutedText: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primaryText: { ...typography.bodyLarge, color: colors.primary },
  sectionLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  summaryCard: { gap: spacing.lg },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(104,253,179,0.22)", borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 },
  summaryTop: { alignItems: "center", flexDirection: "row", gap: spacing.md }
});
