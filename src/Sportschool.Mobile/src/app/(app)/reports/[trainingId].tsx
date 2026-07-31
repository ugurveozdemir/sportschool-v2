import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachTrainingReportDetails } from "@/features/coach/api";
import type { CoachTrainingAthleteReportItem } from "@/features/coach/types";
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
  const [selectedReport, setSelectedReport] = useState<CoachTrainingAthleteReportItem | null>(null);

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
          <Pressable key={athleteReport.report.id} onPress={() => setSelectedReport(athleteReport)} style={styles.athleteReportRow}>
            <View style={styles.flexOne}>
              <Text style={styles.athleteName}>{athleteReport.athleteName}</Text>
              <Text style={styles.meta}>Raporlayan: {athleteReport.report.coachName}</Text>
            </View>
            <Pill label={`%${reportAverage(athleteReport).toFixed(0)}`} tone="success" />
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} />
          </Pressable>
        ))}
      </SurfaceCard>

      <AthleteReportModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </ScreenShell>
  );
}

function reportAverage(item: CoachTrainingAthleteReportItem) {
  const report = item.report;
  return (report.nutritionScore
    + report.cognitiveDevelopmentScore
    + report.disciplineScore
    + report.physicalConditionScore
    + report.psychologicalDevelopmentScore
    + report.tacticalDevelopmentScore
    + report.technicalDevelopmentScore) / 7;
}

function AthleteReportModal({ report, onClose }: { report: CoachTrainingAthleteReportItem | null; onClose: () => void }) {
  const values = report?.report;
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={report !== null}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flexOne}>
              <Text style={styles.modalTitle}>{report?.athleteName}</Text>
              <Text style={styles.subtitle}>Antrenman raporu</Text>
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          {values ? (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.meta}>Raporlayan: {values.coachName}</Text>
              <View style={styles.metricGrid}>
                <ReportMetric label="Beslenme" value={values.nutritionScore} />
                <ReportMetric label="Bilişsel gelişim" value={values.cognitiveDevelopmentScore} />
                <ReportMetric label="Disiplin" value={values.disciplineScore} />
                <ReportMetric label="Fizik/kondisyon" value={values.physicalConditionScore} />
                <ReportMetric label="Psikolojik gelişim" value={values.psychologicalDevelopmentScore} />
                <ReportMetric label="Taktik gelişim" value={values.tacticalDevelopmentScore} />
                <ReportMetric label="Teknik gelişim" value={values.technicalDevelopmentScore} />
              </View>
              {values.coachNote ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>ANTRENÖR NOTU</Text>
                  <Text style={styles.noteText}>{values.coachNote}</Text>
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>%{value.toFixed(0)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  athleteName: { ...typography.title, color: colors.primary },
  athleteReportRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.md },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  card: { gap: spacing.md },
  closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  emptyCard: { gap: spacing.md },
  flexOne: { flex: 1 },
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  meta: { ...typography.body, color: colors.onSurfaceVariant },
  metricCard: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, gap: spacing.xs, padding: spacing.md, width: "48%" },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricLabel: { ...typography.body, color: colors.onSurfaceVariant },
  metricValue: { ...typography.title, color: colors.primary },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "82%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  noteBox: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
  noteLabel: { ...typography.label, color: colors.onSurfaceVariant },
  noteText: { ...typography.bodyLarge, color: colors.onSurface },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary }
});
