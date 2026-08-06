import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useDevelopmentSummary } from "@/features/me/api";
import type { TrainingReportResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

const metrics = [
  ["Beslenme", "nutritionScore"],
  ["Bilişsel gelişim", "cognitiveDevelopmentScore"],
  ["Disiplin", "disciplineScore"],
  ["Fizik kondisyon", "physicalConditionScore"],
  ["Psikolojik gelişim", "psychologicalDevelopmentScore"],
  ["Taktik gelişim", "tacticalDevelopmentScore"],
  ["Teknik gelişim", "technicalDevelopmentScore"]
] as const;

export default function MemberTrainingReportScreen() {
  const { session } = useSession();
  const { selectedAthleteProfileId } = useAthleteSelection();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();
  const isMember = session?.loginRole === "Athlete" || session?.loginRole === "Parent";
  const summaryQuery = useDevelopmentSummary(isMember, selectedAthleteProfileId);

  if (summaryQuery.isLoading) {
    return <LoadingState label="Rapor yükleniyor" />;
  }

  const report = summaryQuery.data?.reports.find((item) => item.trainingSessionId === trainingId);
  if (!report) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.title}>Rapor bulunamadı</Text>
          <Text style={styles.subtitle}>Bu antrenman için sana ait bir rapor bulunmuyor.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.flexOne}>
          <Text style={styles.title}>Antrenman Raporum</Text>
          <Text style={styles.subtitle}>{report.trainingTitle}</Text>
        </View>
      </View>

      <SurfaceCard style={styles.overviewCard}>
        <Text style={styles.kicker}>{formatDate(report.trainingCompletedAt)}</Text>
        <Text style={styles.overviewScore}>{reportAverage(report).toFixed(0)}</Text>
        <Text style={styles.overviewCaption}>Bu antrenmandaki genel puanın</Text>
        <View style={styles.coachRow}>
          <InitialsAvatar label={initials(report.coachName)} size={34} tone="dark" />
          <View>
            <Text style={styles.coachName}>{report.coachName}</Text>
            <Text style={styles.coachRole}>Antrenör değerlendirmesi</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.metricsCard}>
        <Text style={styles.sectionTitle}>Performans Metrikleri</Text>
        {metrics.map(([label, key]) => <MetricBar key={key} label={label} value={report[key]} />)}
      </SurfaceCard>

      <SurfaceCard style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <MaterialCommunityIcons name="message-text-outline" size={22} color={colors.primaryContainer} />
          <Text style={styles.sectionTitle}>Antrenör Notu</Text>
        </View>
        <Text style={styles.noteText}>{report.coachNote?.trim() || "Bu antrenman için ek antrenör notu girilmemiş."}</Text>
      </SurfaceCard>
    </ScreenShell>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const score = Math.max(0, Math.min(value, 100));
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>%{score.toFixed(0)}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${score}%` }]} />
      </View>
    </View>
  );
}

function reportAverage(report: TrainingReportResponse) {
  return (report.nutritionScore
    + report.cognitiveDevelopmentScore
    + report.disciplineScore
    + report.physicalConditionScore
    + report.psychologicalDevelopmentScore
    + report.tacticalDevelopmentScore
    + report.technicalDevelopmentScore) / 7;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  coachName: { ...typography.title, color: colors.onSurface },
  coachRole: { ...typography.body, color: colors.onSurfaceVariant },
  coachRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, width: "100%" },
  emptyCard: { gap: spacing.md },
  fill: { backgroundColor: colors.primaryContainer, borderRadius: radius.full, height: "100%" },
  flexOne: { flex: 1 },
  header: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  kicker: { ...typography.label, color: colors.primaryFixed, textTransform: "uppercase" },
  metricHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { ...typography.body, color: colors.onSurfaceVariant },
  metricRow: { gap: spacing.xs },
  metricValue: { ...typography.title, color: colors.primaryContainer },
  metricsCard: { gap: spacing.lg },
  noteCard: { gap: spacing.md },
  noteHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteText: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 23 },
  overviewCaption: { ...typography.body, color: colors.onSurfaceVariant },
  overviewCard: { alignItems: "center", backgroundColor: colors.surfaceContainerHighest, gap: spacing.xs, paddingVertical: spacing.lg },
  overviewScore: { ...typography.display, color: colors.primaryContainer, fontSize: 56, lineHeight: 62 },
  sectionTitle: { ...typography.title, color: colors.onSurface },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.onSurface },
  track: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, height: 8, overflow: "hidden" }
});
