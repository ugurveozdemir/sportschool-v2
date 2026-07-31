import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useCoachAthletes } from "@/features/coach/api";
import type { CoachAthleteListItem } from "@/features/coach/types";
import { useAttendance, useTrainings } from "@/features/me/api";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ProfileAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
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
  const coachAthletesQuery = useCoachAthletes(isCoach);

  if (isCoach && coachAthletesQuery.isLoading) {
    return <LoadingState label="Sporcular yükleniyor" />;
  }

  if (!isCoach && attendanceQuery.isLoading) {
    return <LoadingState label="Yoklama kayıtları yükleniyor" />;
  }

  if (isCoach) {
    const athletes = coachAthletesQuery.data ?? [];
    const scoredAthletes = athletes.filter((athlete) => athlete.latestAverageScore !== null).length;
    const groupCount = new Set(athletes.flatMap((athlete) => athlete.groups)).size;

    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <View style={styles.headerBlock}>
          <View>
            <Text style={styles.title}>Raporlama</Text>
            <Text style={styles.subtitle}>Tamamlanan antrenmanların raporlarını sporcu bazında görüntüle.</Text>
          </View>
          <View style={styles.metricsRow}>
            <MetricTile icon="account-multiple-outline" label="Sporcu" value={`${athletes.length}`} />
            <MetricTile icon="account-group-outline" label="Grup" value={`${groupCount}`} tone="success" />
            <MetricTile icon="chart-line" label="Raporlu" value={`${scoredAthletes}`} tone="warning" />
          </View>
        </View>

        <View style={styles.rosterList}>
          {athletes.length === 0 ? (
            <SurfaceCard>
              <EmptyState title="Sporcu yok" description="Henüz sana atanmış aktif sporcu bulunmuyor." />
            </SurfaceCard>
          ) : (
            athletes.map((athlete) => <AthleteRow key={athlete.athleteProfileId} athlete={athlete} />)
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

function AthleteRow({ athlete }: { athlete: CoachAthleteListItem }) {
  const name = `${athlete.firstName} ${athlete.lastName}`;
  const score = athlete.latestAverageScore;
  return (
    <Pressable onPress={() => router.push({ pathname: "/athletes/[athleteProfileId]", params: { athleteProfileId: athlete.athleteProfileId } })}>
      <SurfaceCard style={styles.athleteCard}>
        <ProfileAvatar uri={athlete.profileImageUrl ? resolveApiUrl(athlete.profileImageUrl) : null} label={initials(name)} size={46} tone="light" />
        <View style={styles.flexOne}>
          <Text style={styles.athleteName}>{name}</Text>
          <Text style={styles.rowMeta}>{athlete.groups.join(", ") || "Grup ataması yok"}</Text>
          <Text style={styles.rowMeta}>Veli: {athlete.parentFullName}</Text>
        </View>
        {score !== null ? <Pill label={`${score.toFixed(1)} skor`} tone="success" /> : <Pill label="Rapor yok" tone="neutral" />}
        <MaterialCommunityIcons name="chevron-right" size={26} color={colors.outline} />
      </SurfaceCard>
    </Pressable>
  );
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  athleteCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  athleteName: { ...typography.title, color: colors.primary },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.lg },
  historyRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  rosterList: { gap: spacing.md },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary }
});
