import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useCoachTrainingReports } from "@/features/coach/api";
import type { CoachTrainingReportListItem } from "@/features/coach/types";
import { useAttendance, useTrainings } from "@/features/me/api";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getAttendanceLabel } from "@/shared/utils/status";

export default function AttendanceScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const { selectedAthleteProfileId } = useAthleteSelection();
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

  const records = attendanceQuery.data ?? [];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "S"} size={38} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Yoklama</Text>
        <Text style={styles.subtitle}>Antrenman katılım geçmişin.</Text>
      </View>
      <View style={styles.rosterList}>
        {records.length === 0 ? (
          <SurfaceCard>
            <EmptyState title="Kayıt yok" description="Henüz yoklama kaydı bulunmuyor." />
          </SurfaceCard>
        ) : (
          records.map((record) => {
            if (record.status === null) {
              return null;
            }
            const training = trainingsQuery.data?.find((item) => item.id === record.trainingSessionId);
            const tone = record.status === "Present" ? "success" : "danger";
            return (
              <SurfaceCard key={record.id} style={styles.historyRow}>
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
  chevron: { color: colors.outline, fontSize: 30, lineHeight: 30 },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.lg },
  historyRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  reportAction: { alignItems: "flex-end", gap: spacing.xs },
  reportDate: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  rosterList: { gap: spacing.md },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary },
  trainingReportCard: { alignItems: "center", flexDirection: "row", gap: spacing.md }
});
