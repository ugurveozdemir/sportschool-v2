import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachAthlete } from "@/features/coach/api";
import type { TrainingReportResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, CircularScore, Pill, ProfileAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function CoachAthleteDetailScreen() {
  const { session } = useSession();
  const { athleteProfileId } = useLocalSearchParams<{ athleteProfileId: string }>();
  const athleteQuery = useCoachAthlete(athleteProfileId);
  const [selectedReport, setSelectedReport] = useState<TrainingReportResponse | null>(null);

  if (athleteQuery.isLoading) {
    return <LoadingState label="Sporcu bilgileri yükleniyor" />;
  }

  const athlete = athleteQuery.data;
  if (!athlete) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.title}>Sporcu bulunamadı</Text>
          <Text style={styles.subtitle}>Bu sporcu sana atanmış aktif gruplarda görünmüyor.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const name = `${athlete.firstName} ${athlete.lastName}`;
  const trainingReports = athlete.trainingReports;
  const latestReport = trainingReports[0];
  const chartValues = trainingReports.length > 0
    ? trainingReports.slice(0, 6).reverse().map(reportAverage)
    : [];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.identity}>
          <ProfileAvatar uri={athlete.profileImageUrl ? resolveApiUrl(athlete.profileImageUrl) : null} label={initials(name)} size={84} tone="dark" />
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>{athlete.groups.join(", ") || "Grup ataması yok"}</Text>
          <View style={styles.pillRow}>
            <Pill label={`Doğum: ${formatDate(athlete.birthDate)}`} tone="neutral" />
            {latestReport ? <Pill label={`%${reportAverage(latestReport).toFixed(0)} son skor`} tone="success" /> : <Pill label="Rapor yok" tone="warning" />}
          </View>
        </View>
      </View>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Gelişim Özeti" />
        <View style={styles.metricsGrid}>
          <CircularScore value={latestReport?.technicalDevelopmentScore ?? 0} label="Teknik" />
          <CircularScore value={latestReport?.physicalConditionScore ?? 0} label="Fizik" />
          <CircularScore value={latestReport?.disciplineScore ?? 0} label="Disiplin" color={colors.primary} />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Temel Bilgiler" />
        <Info label="Doğum tarihi" value={formatDate(athlete.birthDate)} />
        <Info label="Yaş" value={`${formatAge(athlete.birthDate)} yaş`} />
        <Info label="Baskın ayak" value={preferredFootLabel(athlete.preferredFoot)} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Akademi Bilgileri" />
        <Info label="Kayıt tarihi" value={formatDate(athlete.createdAt)} />
        {athlete.groups.length === 0 ? <Text style={styles.muted}>Henüz grup ataması yok.</Text> : null}
        {athlete.groups.map((group) => (
          <View key={group} style={styles.groupRow}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.primary} />
            <Text style={styles.groupName}>{group}</Text>
            <Pill label="Aktif" tone="success" />
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Veli Bilgileri" />
        <Info label="Veli" value={athlete.parentFullName} />
        <Info label="Telefon" value={athlete.parentPhone} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Gelişim Geçmişi" action={trainingReports.length > 0 ? "Son 6 Antrenman" : undefined} />
        {trainingReports.length > 0 ? <BarChart values={chartValues} /> : null}
        <Text style={styles.historyLabel}>Antrenman Raporları</Text>
        {trainingReports.length === 0 ? <Text style={styles.muted}>Tamamlanan antrenman raporu bulunmuyor.</Text> : null}
        {trainingReports.map((report) => (
          <Pressable key={report.id} onPress={() => setSelectedReport(report)} style={styles.reportItem}>
            <View style={styles.reportItemHeader}>
              <Text style={styles.reportDate}>{formatDate(report.trainingCompletedAt)}</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.outline} />
            </View>
            <Text style={styles.reportSummary}>{report.trainingTitle} · Antrenman Raporu</Text>
            <Text style={styles.muted}>Raporlayan: {report.coachName}</Text>
          </Pressable>
        ))}
      </SurfaceCard>

      <TrainingReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </ScreenShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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

function preferredFootLabel(value: "Unknown" | "Right" | "Left" | "Both") {
  return {
    Unknown: "Belirtilmedi",
    Right: "Sağ",
    Left: "Sol",
    Both: "İki ayaklı"
  }[value];
}

function formatAge(birthDate: string) {
  const today = new Date();
  const birth = new Date(`${birthDate}T00:00:00`);
  let age = today.getFullYear() - birth.getFullYear();
  const hasNotHadBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (hasNotHadBirthday) age--;
  return age;
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function TrainingReportDetailsModal({ report, onClose }: { report: TrainingReportResponse | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={report !== null}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flexOne}>
              <Text style={styles.modalTitle}>Antrenman Raporu</Text>
              {report ? <Text style={styles.modalSubtitle}>{report.trainingTitle}</Text> : null}
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          {report ? (
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.muted}>{formatDate(report.trainingCompletedAt)} · Raporlayan: {report.coachName}</Text>
              <View style={styles.detailScoreGrid}>
                <ReportMetric label="Beslenme" value={report.nutritionScore} />
                <ReportMetric label="Bilişsel gelişim" value={report.cognitiveDevelopmentScore} />
                <ReportMetric label="Disiplin" value={report.disciplineScore} />
                <ReportMetric label="Fizik/kondisyon" value={report.physicalConditionScore} />
                <ReportMetric label="Psikolojik gelişim" value={report.psychologicalDevelopmentScore} />
                <ReportMetric label="Taktik gelişim" value={report.tacticalDevelopmentScore} />
                <ReportMetric label="Teknik gelişim" value={report.technicalDevelopmentScore} />
              </View>
              {report.coachNote ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteLabel}>ANTRENÖR NOTU</Text>
                  <Text style={styles.noteText}>{report.coachNote}</Text>
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
    <View style={styles.detailMetric}>
      <Text style={styles.detailMetricValue}>%{value.toFixed(0)}</Text>
      <Text style={styles.detailMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  card: { gap: spacing.md },
  closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  detailHeader: { gap: spacing.md },
  detailMetric: { backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, gap: spacing.xs, padding: spacing.md, width: "48%" },
  detailMetricLabel: { ...typography.body, color: colors.onSurfaceVariant },
  detailMetricValue: { ...typography.title, color: colors.primary },
  detailScoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  emptyCard: { gap: spacing.md },
  flexOne: { flex: 1 },
  groupName: { ...typography.bodyLarge, color: colors.primary, flex: 1 },
  groupRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  historyLabel: { ...typography.title, color: colors.onSurface, marginTop: spacing.sm },
  identity: { alignItems: "center", gap: spacing.sm },
  infoLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  infoRow: { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm },
  infoValue: { ...typography.bodyLarge, color: colors.onSurface },
  metricsGrid: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-around" },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "82%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalSubtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  modalTitle: { ...typography.headline, color: colors.primary },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  noteBox: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.md },
  noteLabel: { ...typography.label, color: colors.onSurfaceVariant },
  noteText: { ...typography.bodyLarge, color: colors.onSurface },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  reportDate: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  reportItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md, paddingVertical: spacing.sm },
  reportItemHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  reportSummary: { ...typography.bodyLarge, color: colors.onSurface },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.headline, color: colors.primary, textAlign: "center" }
});
