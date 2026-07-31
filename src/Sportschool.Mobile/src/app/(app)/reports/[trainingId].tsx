import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachTrainingReportDetails } from "@/features/coach/api";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function TrainingReportDetailScreen() {
  const { session } = useSession();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();
  const reportQuery = useCoachTrainingReportDetails(trainingId);

  if (reportQuery.isLoading) {
    return <LoadingState label="Antrenman raporu yükleniyor" />;
  }

  const report = reportQuery.data;
  if (!report) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.title}>Rapor bulunamadı</Text>
          <Text style={styles.subtitle}>Bu antrenman için görüntülenecek rapor olmayabilir.</Text>
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
          <Text style={styles.title}>Antrenman Raporu</Text>
          <Text style={styles.subtitle}>{report.trainingTitle}</Text>
          <Text style={styles.meta}>{formatDate(report.trainingCompletedAt)} · Antrenör: {report.coachName}</Text>
        </View>
      </View>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Sporcu Raporları" action={`${report.reports.length} sporcu`} />
        {report.reports.length === 0 ? <EmptyState title="Rapor yok" description="Bu antrenman için henüz sporcu raporu girilmemiş." /> : null}
        {report.reports.map((athleteReport) => (
          <Pressable
            key={athleteReport.report.id}
            onPress={() => router.push({
              pathname: "/reports/[trainingId]/athletes/[athleteProfileId]",
              params: { trainingId, athleteProfileId: athleteReport.athleteProfileId }
            })}
            style={styles.athleteReportRow}
          >
            <View style={styles.flexOne}>
              <Text style={styles.athleteName}>{athleteReport.athleteName}</Text>
              <Text style={styles.meta}>Raporlayan: {athleteReport.report.coachName}</Text>
            </View>
            <Pill label={`%${reportAverage(athleteReport.report).toFixed(0)}`} tone="success" />
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} />
          </Pressable>
        ))}
      </SurfaceCard>
    </ScreenShell>
  );
}

function reportAverage(report: { nutritionScore: number; cognitiveDevelopmentScore: number; disciplineScore: number; physicalConditionScore: number; psychologicalDevelopmentScore: number; tacticalDevelopmentScore: number; technicalDevelopmentScore: number }) {
  return (report.nutritionScore
    + report.cognitiveDevelopmentScore
    + report.disciplineScore
    + report.physicalConditionScore
    + report.psychologicalDevelopmentScore
    + report.tacticalDevelopmentScore
    + report.technicalDevelopmentScore) / 7;
}

const styles = StyleSheet.create({
  athleteName: { ...typography.title, color: colors.primary },
  athleteReportRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  card: { gap: spacing.md },
  emptyCard: { gap: spacing.md },
  flexOne: { flex: 1 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  meta: { ...typography.body, color: colors.onSurfaceVariant },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary }
});
