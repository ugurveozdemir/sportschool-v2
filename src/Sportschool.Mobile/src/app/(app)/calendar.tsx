import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachTrainings } from "@/features/coach/api";
import { useGroups, useTrainings } from "@/features/me/api";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatTime } from "@/shared/utils/date";

const calendarDays = [28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const markedPrimary = new Set([10, 17]);
const markedSecondary = new Set([3, 6, 17, 20]);

type TrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  location: string | null;
  groupName?: string;
  totalAthletes?: number;
};

export default function CalendarScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const trainingsQuery = useTrainings(!isCoach);
  const groupsQuery = useGroups(!isCoach);
  const coachTrainingsQuery = useCoachTrainings(isCoach);

  if ((isCoach ? coachTrainingsQuery : trainingsQuery).isLoading) {
    return <LoadingState label="Antrenmanlar yükleniyor" />;
  }

  const trainings = ((isCoach ? coachTrainingsQuery.data : trainingsQuery.data) ?? []) as TrainingItem[];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={isCoach ? undefined : <InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "E"} size={42} tone="dark" />}>
      {isCoach ? <CoachCalendar trainings={trainings} /> : <MemberCalendar trainings={trainings} groupName={(groupId) => groupsQuery.data?.find((group) => group.id === groupId)?.name ?? "A Takımı"} />}
    </ScreenShell>
  );
}

function CoachCalendar({ trainings }: { trainings: TrainingItem[] }) {
  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.coachTitle}>Antrenman Takvimi</Text>
        <View style={styles.segmented}>
          <View style={styles.segmentedActive}><Text style={styles.segmentedActiveText}>Aylık</Text></View>
          <View style={styles.segmentedInactive}><Text style={styles.segmentedInactiveText}>Haftalık</Text></View>
        </View>
      </View>
      <CalendarPanel roundedDays />
      <ScheduleList title="17 Ekim Salı" subtitle={`${Math.max(trainings.length || 2, 2)} Planlı Antrenman`} trainings={trainings} coach />
    </>
  );
}

function MemberCalendar({ trainings, groupName }: { trainings: TrainingItem[]; groupName: (groupId: string) => string }) {
  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.memberTitle}>Antrenman Programı</Text>
        <Text style={styles.subtitle}>Ekim 2023</Text>
      </View>
      <SurfaceCard style={styles.monthNav}>
        <MaterialCommunityIcons name="chevron-left" size={28} color={colors.primary} />
        <Text style={styles.monthTitle}>Ekim 2023</Text>
        <MaterialCommunityIcons name="chevron-right" size={28} color={colors.primary} />
      </SurfaceCard>
      <CalendarPanel />
      <ScheduleList title="17 Ekim Salı" subtitle={`${Math.max(trainings.length || 2, 2)} Etkinlik`} trainings={trainings} groupName={groupName} />
    </>
  );
}

function CalendarPanel({ roundedDays }: { roundedDays?: boolean }) {
  return (
    <SurfaceCard style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthTitle}>Ekim 2023</Text>
        <View style={styles.calendarArrows}>
          <View style={styles.circleButton}><MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} /></View>
          <View style={styles.circleButton}><MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} /></View>
        </View>
      </View>
      <View style={styles.weekRow}>{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <Text key={day} style={styles.weekText}>{day}</Text>)}</View>
      <View style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          const inactive = index < 3;
          const selected = day === 17;
          return (
            <View key={`${day}-${index}`} style={[styles.dayCell, roundedDays && styles.dayCellRound, selected && styles.daySelected]}>
              <Text style={[styles.dayText, inactive && styles.dayTextInactive, selected && styles.dayTextSelected]}>{day}</Text>
              <View style={styles.dotRow}>
                {markedSecondary.has(day) ? <View style={[styles.dot, selected && styles.dotSelected, { backgroundColor: colors.secondary }]} /> : null}
                {markedPrimary.has(day) ? <View style={[styles.dot, selected && styles.dotSelected, { backgroundColor: colors.primary }]} /> : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <Legend color={colors.primary} label="Antrenman" />
        <Legend color={colors.secondary} label="Maç" />
      </View>
    </SurfaceCard>
  );
}

function ScheduleList({ title, subtitle, trainings, coach, groupName }: { title: string; subtitle: string; trainings: TrainingItem[]; coach?: boolean; groupName?: (groupId: string) => string }) {
  const cards = trainings.length > 0 ? trainings.slice(0, 2) : [];

  return (
    <View style={styles.scheduleWrap}>
      <View style={styles.scheduleHeader}>
        <View>
          <Text style={styles.scheduleTitle}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {coach ? <Text style={styles.addLink}>+ Yeni Ekle</Text> : null}
      </View>
      {cards.length === 0 ? (
        <SurfaceCard>
          <EmptyState title="Program boş" description="Şu anda görüntülenecek antrenman bulunmuyor." />
        </SurfaceCard>
      ) : (
        cards.map((training, index) => <TrainingCard key={training.id} training={training} accent={index === 0 ? "secondary" : "warning"} coach={coach} group={training.groupName ?? groupName?.(training.groupId) ?? "A Takımı"} />)
      )}
      {cards.length === 1 ? <TrainingCard training={fallbackMatch} accent="secondary" group="A Takımı" /> : null}
    </View>
  );
}

function TrainingCard({ training, accent, coach, group }: { training: TrainingItem; accent: "secondary" | "warning"; coach?: boolean; group: string }) {
  const accentColor = accent === "secondary" ? colors.secondary : colors.tertiaryFixedDim;
  return (
    <SurfaceCard style={styles.trainingCard}>
      <View style={[styles.trainingAccent, { backgroundColor: accentColor }]} />
      <View style={styles.trainingTopRow}>
        <View style={styles.trainingTimeBlock}>
          <Text style={styles.trainingTime}>{formatTime(training.startsAt)}</Text>
          {coach ? <Text style={styles.trainingEnd}>{formatTime(training.endsAt)}</Text> : null}
        </View>
        {!coach ? <Pill label={training.id === fallbackMatch.id ? "Hazırlık Maçı" : "Antrenman"} tone={accent === "secondary" ? "success" : "neutral"} icon={training.id === fallbackMatch.id ? "trophy-outline" : "soccer"} /> : null}
      </View>
      <View style={styles.tagRow}>
        {coach ? <Pill label={training.title.toLowerCase().includes("kondisyon") ? "Kondisyon" : "Taktik"} tone="neutral" /> : null}
        {coach && accent === "secondary" ? <Pill label="Zorunlu" tone="success" /> : null}
      </View>
      <Text style={styles.trainingTitle}>{coach ? `${group} Antrenmanı` : training.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>⌖ {training.location ?? (coach ? "Saha 1 (Ana Çim)" : "Tesisler 2 No'lu Saha")}</Text>
        <Text style={styles.metaText}>{coach ? `♟ ${training.totalAthletes ?? 18} Oyuncu` : "◷ 90 Dakika"}</Text>
      </View>
    </SurfaceCard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const fallbackMatch: TrainingItem = {
  id: "fallback-match",
  title: "vs. Altay U19",
  startsAt: "2023-10-17T19:30:00Z",
  endsAt: "2023-10-17T21:00:00Z",
  groupId: "fallback",
  groupName: "A Takımı",
  location: "Merkez Stadyum",
  totalAthletes: 22
};

const styles = StyleSheet.create({
  addLink: { ...typography.label, color: colors.secondary, fontSize: 14 },
  calendarArrows: { flexDirection: "row", gap: spacing.sm },
  calendarCard: { gap: spacing.lg },
  calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  circleButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  coachTitle: { ...typography.headline, color: colors.primary },
  dayCell: { alignItems: "center", aspectRatio: 1, justifyContent: "center" },
  dayCellRound: { borderRadius: radius.full },
  daySelected: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { height: 4, width: 0 } },
  dayText: { ...typography.bodyLarge, color: colors.primary },
  dayTextInactive: { color: colors.outlineVariant },
  dayTextSelected: { color: colors.onPrimary, fontFamily: "Inter_700Bold" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dot: { borderRadius: 3, height: 6, width: 6 },
  dotRow: { flexDirection: "row", gap: 2, height: 8, marginTop: 2 },
  dotSelected: { backgroundColor: colors.secondaryContainer },
  headerBlock: { gap: spacing.lg },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  legendRow: { flexDirection: "row", gap: spacing.xl, justifyContent: "center" },
  legendText: { ...typography.label, color: colors.onSurfaceVariant },
  memberTitle: { ...typography.display, color: colors.primary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.sm },
  metaText: { ...typography.body, color: colors.onSurfaceVariant },
  monthNav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  monthTitle: { ...typography.title, color: colors.primary },
  scheduleHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  scheduleTitle: { ...typography.headline, color: colors.primary },
  scheduleWrap: { gap: spacing.md },
  segmented: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  segmentedActive: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flex: 1, padding: spacing.md },
  segmentedActiveText: { ...typography.label, color: colors.onPrimary },
  segmentedInactive: { alignItems: "center", flex: 1, padding: spacing.md },
  segmentedInactiveText: { ...typography.label, color: colors.onSurfaceVariant },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  tagRow: { flexDirection: "row", gap: spacing.sm },
  trainingAccent: { bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  trainingCard: { gap: spacing.md, paddingLeft: spacing.xl },
  trainingEnd: { ...typography.body, color: colors.outline, textDecorationLine: "line-through" },
  trainingTime: { ...typography.headline, color: colors.primary },
  trainingTimeBlock: { flex: 1 },
  trainingTitle: { ...typography.title, color: colors.primary },
  trainingTopRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekText: { ...typography.label, color: colors.outline, flex: 1, textAlign: "center" }
});
