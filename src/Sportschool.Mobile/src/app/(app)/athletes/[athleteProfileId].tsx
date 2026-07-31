import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachAthlete } from "@/features/coach/api";
import type { AthleteReportResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, CircularScore, Pill, ProfileAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function CoachAthleteDetailScreen() {
  const { session } = useSession();
  const { athleteProfileId } = useLocalSearchParams<{ athleteProfileId: string }>();
  const athleteQuery = useCoachAthlete(athleteProfileId);

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
  const currentAthleteId = athlete.athleteProfileId;
  const latestReport = athlete.reports[0];
  const chartValues = athlete.reports.length > 0
    ? athlete.reports.slice(0, 6).reverse().map((report) => averageScore(report) * 10)
    : [35, 48, 55, 64, 70, 78];

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
            {latestReport ? <Pill label={`${averageScore(latestReport).toFixed(1)} son skor`} tone="success" /> : <Pill label="Rapor yok" tone="warning" />}
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <CircularScore value={scorePercent(latestReport?.speedScore)} label="Hız" />
        <CircularScore value={scorePercent(latestReport?.dribblingScore)} label="Teknik" />
        <CircularScore value={scorePercent(latestReport?.strengthScore)} label="Güç" color={colors.primary} />
      </View>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Veli Bilgileri" />
        <Info label="Veli" value={athlete.parentFullName} />
        <Info label="Telefon" value={athlete.parentPhone} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Gelişim Grafiği" action={athlete.reports.length > 0 ? "Son 6 Rapor" : "Örnek"} />
        <BarChart values={chartValues} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Son Raporlar" />
        {athlete.reports.length === 0 ? <Text style={styles.muted}>Henüz rapor girilmemiş.</Text> : null}
        {athlete.reports.slice(0, 3).map((report) => (
          <View key={report.id} style={styles.reportItem}>
            <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
            <Text style={styles.reportSummary}>{report.summary}</Text>
            <Text style={styles.muted}>Gelişim alanı: {report.improvementAreas}</Text>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Antrenman Raporları" />
        <Text style={styles.muted}>Yeni raporlar, tamamlanan antrenmanın içinden girilir.</Text>
      </SurfaceCard>
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

function averageScore(report: AthleteReportResponse) {
  return (report.speedScore + report.strengthScore + report.dribblingScore + report.shootingScore) / 4;
}

function scorePercent(score?: number) {
  return Math.round((score ?? 0) * 10);
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  card: { gap: spacing.md },
  detailHeader: { gap: spacing.md },
  emptyCard: { gap: spacing.md },
  identity: { alignItems: "center", gap: spacing.sm },
  infoLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  infoRow: { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm },
  infoValue: { ...typography.bodyLarge, color: colors.onSurface },
  metricsGrid: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-around" },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  reportDate: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  reportItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  reportSummary: { ...typography.bodyLarge, color: colors.onSurface },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.headline, color: colors.primary, textAlign: "center" }
});
