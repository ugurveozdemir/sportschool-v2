import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useCoachTrainingReportDetails } from "@/features/coach/api";
import { Button } from "@/shared/components/Button";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ProfileAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate } from "@/shared/utils/date";

export default function AthleteTrainingReportScreen() {
  const { trainingId, athleteProfileId } = useLocalSearchParams<{ trainingId: string; athleteProfileId: string }>();
  const reportQuery = useCoachTrainingReportDetails(trainingId);

  if (reportQuery.isLoading) {
    return <LoadingState label="Sporcu raporu yükleniyor" />;
  }

  const trainingReport = reportQuery.data;
  const athleteReport = trainingReport?.reports.find((item) => item.athleteProfileId === athleteProfileId);
  if (!trainingReport || !athleteReport) {
    return (
      <ScreenShell title="Sporcu Raporu">
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.pageTitle}>Rapor bulunamadı</Text>
          <Text style={styles.muted}>Bu sporcu için seçilen antrenman raporu bulunmuyor.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const report = athleteReport.report;
  const groupName = athleteReport.groups.join(" · ") || "Sporcu grubu";

  return (
    <ScreenShell title="Sporcu Raporu">
      <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
      </Pressable>

      <SurfaceCard style={styles.profileCard}>
        <View style={styles.avatarRing}>
          <ProfileAvatar
            uri={athleteReport.profileImageUrl ? resolveApiUrl(athleteReport.profileImageUrl) : null}
            label={initials(athleteReport.athleteName)}
            size={106}
            tone="dark"
          />
        </View>
        <Text style={styles.athleteName}>{athleteReport.athleteName}</Text>
        <Pill label={groupName} tone="warning" />
        <View style={styles.reportMetaBox}>
          <Text style={styles.reportDate}>Tarih: {formatDate(trainingReport.trainingCompletedAt)}</Text>
          <Text style={styles.reportTitle}>{trainingReport.trainingTitle} RAPORU</Text>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.metricCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-line-variant" size={24} color={colors.primaryContainer} />
          <Text style={styles.sectionTitle}>Performans Metrikleri</Text>
        </View>
        <MetricBar label="Beslenme" value={report.nutritionScore} />
        <MetricBar label="Bilişsel gelişim" value={report.cognitiveDevelopmentScore} />
        <MetricBar label="Disiplin" value={report.disciplineScore} />
        <MetricBar label="Fizik kondisyon" value={report.physicalConditionScore} />
        <MetricBar label="Psikolojik gelişim" value={report.psychologicalDevelopmentScore} />
        <MetricBar label="Taktik gelişim" value={report.tacticalDevelopmentScore} />
        <MetricBar label="Teknik gelişim" value={report.technicalDevelopmentScore} />
      </SurfaceCard>

      <SurfaceCard style={styles.noteCard}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="message-text-outline" size={24} color={colors.primaryContainer} />
          <Text style={styles.sectionTitle}>Antrenör Değerlendirmesi</Text>
        </View>
        <Text style={styles.noteText}>{report.coachNote ?? "Bu antrenman için ek antrenör notu girilmemiş."}</Text>
        <View style={styles.coachRow}>
          <InitialsAvatar label={initials(report.coachName)} size={38} tone="dark" />
          <View>
            <Text style={styles.coachName}>{report.coachName}</Text>
            <Text style={styles.coachRole}>ANTRENÖR</Text>
          </View>
        </View>
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
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${score}%` }]} />
      </View>
    </View>
  );
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  athleteName: { ...typography.headline, color: colors.onSurface, textAlign: "center" },
  avatarRing: { alignItems: "center", borderColor: colors.primaryContainer, borderRadius: radius.full, borderWidth: 2, height: 112, justifyContent: "center", overflow: "hidden", width: 112 },
  backButton: { alignItems: "center", height: 40, justifyContent: "center", marginBottom: -spacing.sm, width: 40 },
  coachName: { ...typography.title, color: colors.onSurface },
  coachRole: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  coachRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md },
  emptyCard: { gap: spacing.md },
  metricCard: { gap: spacing.lg },
  metricHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  metricRow: { gap: spacing.xs },
  metricValue: { ...typography.title, color: colors.primaryContainer },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  noteCard: { gap: spacing.md },
  noteText: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
  pageTitle: { ...typography.headline, color: colors.primary },
  profileCard: { alignItems: "center", gap: spacing.md },
  progressFill: { backgroundColor: colors.primaryContainer, borderRadius: radius.full, height: "100%" },
  progressTrack: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, height: 8, overflow: "hidden" },
  reportDate: { ...typography.body, color: colors.onSurface },
  reportMetaBox: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, gap: spacing.xs, padding: spacing.md, width: "100%" },
  reportTitle: { ...typography.label, color: colors.primary, textTransform: "uppercase" },
  sectionHeader: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.md },
  sectionTitle: { ...typography.title, color: colors.onSurface }
});
