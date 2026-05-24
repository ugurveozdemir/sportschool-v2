import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { useAttendance, useGroups, usePayments, useProfile, useReports, useTrainings } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Badge } from "@/shared/components/Badge";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate, formatTime } from "@/shared/utils/date";

export default function HomeScreen() {
  const profileQuery = useProfile();
  const trainingsQuery = useTrainings();
  const groupsQuery = useGroups();
  const attendanceQuery = useAttendance();
  const paymentsQuery = usePayments();
  const reportsQuery = useReports();

  if (profileQuery.isLoading) {
    return <LoadingState label="Panel hazırlanıyor" />;
  }

  const profile = profileQuery.data;
  const trainings = trainingsQuery.data ?? [];
  const nextTraining = trainings.find((training) => new Date(training.startsAt).getTime() >= Date.now()) ?? trainings[0];
  const unpaidCount = (paymentsQuery.data ?? []).filter((payment) => payment.effectiveStatus !== "Paid").length;
  const latestReport = reportsQuery.data?.[0];

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Merhaba, {profile?.firstName ?? "Sporcu"}</Text>
        <Text style={styles.subtitle}>Programını, ödeme durumunu ve gelişim raporlarını buradan takip et.</Text>
      </View>

      {nextTraining ? (
        <View style={styles.heroCard}>
          <MaterialCommunityIcons name="soccer" size={112} color="rgba(255,255,255,0.08)" style={styles.heroIcon} />
          <Text style={styles.heroKicker}>Sıradaki Antrenman</Text>
          <Text style={styles.heroTitle}>{nextTraining.title}</Text>
          <Text style={styles.heroText}>{formatDate(nextTraining.startsAt)} • {formatTime(nextTraining.startsAt)} - {formatTime(nextTraining.endsAt)}</Text>
          <Text style={styles.heroText}>{nextTraining.location ?? "Lokasyon belirtilmedi"}</Text>
        </View>
      ) : (
        <Card>
          <EmptyState title="Antrenman yok" description="Aktif grubun için planlanmış antrenman bulunmuyor." />
        </Card>
      )}

      <View style={styles.metrics}>
        <MetricCard icon="account-group-outline" label="Grup" value={`${groupsQuery.data?.length ?? 0}`} />
        <MetricCard icon="calendar-check-outline" label="Yoklama" value={`${attendanceQuery.data?.length ?? 0}`} />
        <MetricCard icon="credit-card-clock-outline" label="Borç" value={`${unpaidCount}`} danger={unpaidCount > 0} />
      </View>

      {latestReport ? (
        <Card style={styles.reportCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Gelişim Raporu</Text>
            <Badge label={formatDate(latestReport.createdAt)} />
          </View>
          <Text style={styles.body}>{latestReport.summary}</Text>
          <View style={styles.scoreGrid}>
            <Score label="Hız" value={latestReport.speedScore} />
            <Score label="Güç" value={latestReport.strengthScore} />
            <Score label="Dribling" value={latestReport.dribblingScore} />
            <Score label="Şut" value={latestReport.shootingScore} />
          </View>
        </Card>
      ) : null}
    </AppScreen>
  );
}

function MetricCard({ icon, label, value, danger }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; danger?: boolean }) {
  return (
    <Card style={styles.metricCard}>
      <MaterialCommunityIcons name={icon} size={22} color={danger ? colors.error : colors.primary} />
      <Text style={[styles.metricValue, danger && styles.danger]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.score}>
      <Text style={styles.scoreValue}>{value.toFixed(1)}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.onSurfaceVariant },
  danger: { color: colors.error },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, gap: spacing.sm, marginBottom: spacing.lg, overflow: "hidden", padding: spacing.lg },
  heroIcon: { position: "absolute", right: -18, top: -18 },
  heroKicker: { ...typography.label, color: colors.secondaryContainer, textTransform: "uppercase" },
  heroText: { ...typography.body, color: colors.primaryFixedDim },
  heroTitle: { ...typography.headline, color: colors.onPrimary },
  metricCard: { alignItems: "center", flex: 1, gap: spacing.xs, padding: spacing.md },
  metricLabel: { ...typography.label, color: colors.onSurfaceVariant },
  metricValue: { ...typography.headline, color: colors.primary },
  metrics: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  reportCard: { gap: spacing.md },
  score: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flex: 1, gap: 2, padding: spacing.sm },
  scoreGrid: { flexDirection: "row", gap: spacing.sm },
  scoreValue: { ...typography.title, color: colors.primary },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.display, color: colors.primary }
});
