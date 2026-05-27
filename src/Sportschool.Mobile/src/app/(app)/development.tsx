import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachGroups } from "@/features/coach/api";
import type { CoachGroupResponse } from "@/features/coach/types";
import { useReports } from "@/features/me/api";
import type { AthleteReportResponse } from "@/features/me/types";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

const scoreLabels = [
  ["Hız", "speedScore", "run-fast"],
  ["Güç", "strengthScore", "arm-flex-outline"],
  ["Dribling", "dribblingScore", "soccer"],
  ["Şut", "shootingScore", "target"]
] as const;

export default function DevelopmentScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const reportsQuery = useReports(!isCoach);
  const coachGroupsQuery = useCoachGroups(isCoach);

  if (isCoach && coachGroupsQuery.isLoading) {
    return <LoadingState label="Gruplar yükleniyor" />;
  }

  if (!isCoach && reportsQuery.isLoading) {
    return <LoadingState label="Raporlar yükleniyor" />;
  }

  if (isCoach) {
    return <CoachTeams session={session} groups={coachGroupsQuery.data ?? []} />;
  }

  return <DevelopmentReports session={session} reports={reportsQuery.data ?? []} />;
}

function CoachTeams({ session, groups }: { session: ReturnType<typeof useSession>["session"]; groups: CoachGroupResponse[] }) {
  const totalAthletes = groups.reduce((sum, group) => sum + group.athleteCount, 0);

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerBlock}>
        <View>
          <Text style={styles.title}>Gruplar</Text>
          <Text style={styles.subtitle}>Kulüpteki aktif gruplar ve sporcu dağılımı.</Text>
        </View>
        <Pressable style={styles.primaryButton}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Yeni Grup Ekle</Text>
        </Pressable>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile icon="shield-account-outline" label="Grup" value={`${groups.length}`} />
        <MetricTile icon="account-group-outline" label="Sporcu" value={`${totalAthletes}`} tone="success" />
      </View>

      <View style={styles.list}>
        {groups.length === 0 ? (
          <SurfaceCard>
            <EmptyState title="Grup yok" description="Henüz sana atanmış aktif grup bulunmuyor." />
          </SurfaceCard>
        ) : (
          groups.map((group) => <TeamRow key={group.id} group={group} />)
        )}
      </View>
    </ScreenShell>
  );
}

function DevelopmentReports({ session, reports }: { session: ReturnType<typeof useSession>["session"]; reports: AthleteReportResponse[] }) {
  const latest = reports[0];
  const chartValues = reports.length > 0
    ? reports.slice(0, 6).reverse().map((report) => averageScore(report) * 10)
    : [40, 55, 45, 70, 60, 85];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "S"} size={42} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Gelişim</Text>
        <Text style={styles.subtitle}>Performans metrikleri, grafik ve antrenör yorumları.</Text>
      </View>

      {latest ? (
        <>
          <View style={styles.metricsGrid}>
            {scoreLabels.map(([label, key, icon]) => (
              <MetricTile key={key} icon={icon} label={label} value={latest[key].toFixed(1)} tone={key === "speedScore" ? "success" : "primary"} />
            ))}
          </View>

          <SurfaceCard style={styles.chartCard}>
            <SectionTitle title="Gelişim Grafiği" action="Son 6 Rapor" />
            <BarChart values={chartValues} />
            <View style={styles.legendRow}>
              <LegendDot label="Teknik" color={colors.primary} />
              <LegendDot label="Hız" color={colors.secondary} />
              <LegendDot label="Dayanıklılık" color={colors.surfaceContainerHigh} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionHeading}>Antrenör Yorumları</Text>
              <MaterialCommunityIcons name="forum-outline" size={22} color={colors.outline} />
            </View>
            {reports.map((report) => (
              <View key={report.id} style={styles.commentItem}>
                <Text style={styles.date}>{formatDate(report.createdAt)}</Text>
                <Text style={styles.summary}>{report.summary}</Text>
                <Text style={styles.improvement}>Gelişim alanı: {report.improvementAreas}</Text>
              </View>
            ))}
          </SurfaceCard>

          <Pressable style={styles.contactButton}>
            <MaterialCommunityIcons name="chat-outline" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Antrenör ile İletişime Geç</Text>
          </Pressable>
        </>
      ) : (
        <SurfaceCard>
          <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
        </SurfaceCard>
      )}
    </ScreenShell>
  );
}

function TeamRow({ group }: { group: CoachGroupResponse }) {
  return (
    <SurfaceCard style={styles.teamCard}>
      <View style={styles.teamLead}>
        <InitialsAvatar label={groupCode(group.name)} size={54} tone="dark" />
        <View style={styles.flexOne}>
          <Text style={styles.teamTitle}>{group.name}</Text>
          <View style={styles.coachLine}>
            <MaterialCommunityIcons name="account-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.rowMeta}>{group.description ?? "Antrenör açıklaması eklenmemiş"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.teamFooter}>
        <Pill label={`${group.athleteCount} Oyuncu`} tone="neutral" icon="account-group-outline" />
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.outline} />
      </View>
    </SurfaceCard>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.rowMeta}>{label}</Text>
    </View>
  );
}

function averageScore(report: AthleteReportResponse) {
  return (report.speedScore + report.strengthScore + report.dribblingScore + report.shootingScore) / 4;
}

function groupCode(name: string) {
  const match = name.match(/U\d+/i)?.[0];
  return (match ?? name.split(" ").map((part) => part[0]).join("")).slice(0, 3).toUpperCase();
}

const styles = StyleSheet.create({
  chartCard: { gap: spacing.md },
  coachLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  commentCard: { gap: spacing.md },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  commentItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  contactButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  date: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.md },
  improvement: { ...typography.body, color: colors.onSurfaceVariant },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  list: { gap: spacing.md },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  primaryButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  primaryButtonText: { ...typography.label, color: colors.onPrimary },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  sectionHeading: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summary: { ...typography.bodyLarge, color: colors.onSurface },
  teamCard: { gap: spacing.md },
  teamFooter: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md },
  teamLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  teamTitle: { ...typography.title, color: colors.onSurface },
  title: { ...typography.headline, color: colors.primary }
});
