import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useCoachTrainingReports } from "@/features/coach/api";
import type { CoachTrainingReportListItem } from "@/features/coach/types";
import { useAttendance, useTrainings } from "@/features/me/api";
import { ParentAthleteSelector, SelectedAthleteAvatar } from "@/features/me/ParentAthleteSelector";
import type { AttendanceResponse, TrainingResponse } from "@/features/me/types";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { MetricTile, Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getAttendanceLabel } from "@/shared/utils/status";

type AttendanceFilter = "all" | "present" | "absent";

export default function AttendanceScreen() {
  const { session } = useSession();
  const isCoach = session?.loginRole === "Coach" || session?.loginRole === "SchoolAdmin";
  const { selectedAthlete, selectedAthleteProfileId } = useAthleteSelection();
  const attendanceQuery = useAttendance(!isCoach, selectedAthleteProfileId);
  const trainingsQuery = useTrainings(!isCoach, undefined, selectedAthleteProfileId);
  const trainingReportsQuery = useCoachTrainingReports(isCoach);

  if (isCoach && trainingReportsQuery.isLoading) {
    return <LoadingState label="Antrenman raporları yükleniyor" />;
  }

  if (!isCoach && attendanceQuery.isLoading) {
    return <LoadingState label="Yoklama kayıtları yükleniyor" />;
  }

  if (isCoach) {
    const reports = trainingReportsQuery.data ?? [];
    const athleteReportCount = reports.reduce((total, report) => total + report.reportCount, 0);

    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <View style={styles.headerBlock}>
          <View>
            <Text style={styles.title}>Son Antrenman Raporları</Text>
            <Text style={styles.subtitle}>Bir antrenmanı seçerek sporcu raporlarını görüntüle.</Text>
          </View>
          <View style={styles.metricsRow}>
            <MetricTile icon="calendar-check-outline" label="Antrenman" value={`${reports.length}`} />
            <MetricTile icon="file-chart-outline" label="Rapor" value={`${athleteReportCount}`} tone="success" />
          </View>
        </View>

        <View style={styles.rosterList}>
          {reports.length === 0 ? (
            <SurfaceCard>
              <EmptyState title="Rapor yok" description="Tamamlanmış antrenmanlar için henüz sporcu raporu girilmemiş." />
            </SurfaceCard>
          ) : (
            reports.map((report) => <TrainingReportRow key={report.trainingSessionId} report={report} />)
          )}
        </View>
      </ScreenShell>
    );
  }

  return <MemberAttendance session={session} athleteName={selectedAthlete ? `${selectedAthlete.firstName} ${selectedAthlete.lastName}` : "Sporcu"} records={attendanceQuery.data ?? []} trainings={trainingsQuery.data ?? []} />;
}

function MemberAttendance({ session, athleteName, records, trainings }: {
  session: ReturnType<typeof useSession>["session"];
  athleteName: string;
  records: AttendanceResponse[];
  trainings: TrainingResponse[];
}) {
  const isParent = session?.loginRole === "Parent";
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const completedRecords = records.filter(hasAttendanceStatus);
  const presentCount = completedRecords.filter((record) => record.status === "Present").length;
  const absentCount = completedRecords.filter((record) => record.status === "Absent").length;
  const attendanceRate = completedRecords.length > 0 ? Math.round(presentCount / completedRecords.length * 100) : 0;
  const visibleRecords = completedRecords.filter((record) => filter === "all" || record.status === (filter === "present" ? "Present" : "Absent"));

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<SelectedAthleteAvatar />}>
      <ParentAthleteSelector />
      <View style={styles.headerBlock}>
        <Text style={styles.title}>{isParent ? "Antrenman Katılımı" : "Katılımım"}</Text>
        <Text style={styles.subtitle}>{isParent ? `${athleteName} için antrenman katılım geçmişini takip edin.` : "Antrenmanlara katılım geçmişini takip et."}</Text>
      </View>

      <SurfaceCard style={styles.attendanceSummary}>
        <Text style={styles.summaryKicker}>KATILIM ORANI</Text>
        <Text style={styles.summaryRate}>%{attendanceRate}</Text>
        <Text style={styles.summaryCaption}>{completedRecords.length === 0 ? "Henüz yoklama kaydı bulunmuyor." : isParent ? `${athleteName}, ${completedRecords.length} antrenmanın ${presentCount} tanesine katıldı.` : `${completedRecords.length} antrenmanın ${presentCount} tanesine katıldın.`}</Text>
        <View style={styles.summaryStats}>
          <AttendanceStat icon="check-circle-outline" label="Geldi" value={presentCount} tone="success" />
          <View style={styles.summaryDivider} />
          <AttendanceStat icon="close-circle-outline" label="Gelmedi" value={absentCount} tone="danger" />
        </View>
      </SurfaceCard>

      {completedRecords.length > 0 ? (
        <ScrollView contentContainerStyle={styles.filters} horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip active={filter === "all"} label="Tümü" onPress={() => setFilter("all")} />
          <FilterChip active={filter === "present"} label="Geldi" onPress={() => setFilter("present")} />
          <FilterChip active={filter === "absent"} label="Gelmedi" onPress={() => setFilter("absent")} />
        </ScrollView>
      ) : null}

      <View style={styles.rosterList}>
        {completedRecords.length === 0 ? (
          <SurfaceCard>
            <EmptyState title="Kayıt yok" description="Henüz yoklama kaydı bulunmuyor." />
          </SurfaceCard>
        ) : (
          visibleRecords.map((record) => {
            const training = trainings.find((item) => item.id === record.trainingSessionId);
            const tone = record.status === "Present" ? "success" : "danger";
            return (
              <SurfaceCard key={record.id} style={styles.historyRow}>
                <View style={[styles.historyIcon, record.status === "Present" ? styles.historyIconSuccess : styles.historyIconDanger]}>
                  <MaterialCommunityIcons name={record.status === "Present" ? "check" : "close"} size={22} color={record.status === "Present" ? colors.secondary : colors.error} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{training?.title ?? "Antrenman"}</Text>
                  <Text style={styles.rowMeta}>{training ? `${formatDate(training.startsAt)} • ${formatTime(training.startsAt)}` : record.recordedAt ? formatDate(record.recordedAt) : "Tarih yok"}</Text>
                </View>
                <Pill label={getAttendanceLabel(record.status)} tone={tone} />
              </SurfaceCard>
            );
          })
        )}
      </View>
    </ScreenShell>
  );
}

function hasAttendanceStatus(record: AttendanceResponse): record is AttendanceResponse & { status: NonNullable<AttendanceResponse["status"]> } {
  return record.status !== null;
}

function AttendanceStat({ icon, label, value, tone }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: number; tone: "success" | "danger" }) {
  const color = tone === "success" ? colors.secondary : colors.error;
  return (
    <View style={styles.summaryStat}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
      <Text style={styles.summaryStatLabel}>{label}</Text>
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TrainingReportRow({ report }: { report: CoachTrainingReportListItem }) {
  return (
    <Pressable onPress={() => router.push({ pathname: "/reports/[trainingId]", params: { trainingId: report.trainingSessionId } })}>
      <SurfaceCard style={styles.trainingReportCard}>
        <View style={styles.flexOne}>
          <Text style={styles.reportDate}>{formatDate(report.trainingCompletedAt)} · Antrenman Raporu</Text>
          <Text style={styles.rowTitle}>{report.trainingTitle}</Text>
          <Text style={styles.rowMeta}>Antrenör: {report.coachName}</Text>
        </View>
        <View style={styles.reportAction}>
          <Pill label={`${report.reportCount} sporcu`} tone="success" />
          <Text style={styles.chevron}>›</Text>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  attendanceSummary: { alignItems: "center", backgroundColor: colors.surfaceContainerHighest, gap: spacing.xs, paddingVertical: spacing.lg },
  chevron: { color: colors.outline, fontSize: 30, lineHeight: 30 },
  filterChip: { borderColor: colors.outlineVariant, borderRadius: 999, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  filterChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  filterChipText: { ...typography.label, color: colors.onSurfaceVariant },
  filterChipTextActive: { color: colors.onPrimary },
  filters: { gap: spacing.sm },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.lg },
  historyIcon: { alignItems: "center", borderRadius: 999, height: 40, justifyContent: "center", width: 40 },
  historyIconDanger: { backgroundColor: colors.errorContainer },
  historyIconSuccess: { backgroundColor: colors.secondaryContainer },
  historyRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  reportAction: { alignItems: "flex-end", gap: spacing.xs },
  reportDate: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  rosterList: { gap: spacing.md },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  summaryCaption: { ...typography.body, color: colors.onSurfaceVariant, textAlign: "center" },
  summaryDivider: { backgroundColor: colors.outlineVariant, height: 44, width: 1 },
  summaryKicker: { ...typography.label, color: colors.primaryFixed, letterSpacing: 1.1 },
  summaryRate: { ...typography.display, color: colors.primaryContainer, fontSize: 56, lineHeight: 62 },
  summaryStat: { alignItems: "center", flex: 1, gap: 2 },
  summaryStatLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  summaryStats: { alignSelf: "stretch", flexDirection: "row", marginTop: spacing.md },
  summaryStatValue: { ...typography.headline },
  title: { ...typography.headline, color: colors.primary },
  trainingReportCard: { alignItems: "center", flexDirection: "row", gap: spacing.md }
});
