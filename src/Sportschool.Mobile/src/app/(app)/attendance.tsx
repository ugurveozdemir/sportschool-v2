import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachAttendanceRoster, useCoachTrainings, useSaveCoachAttendance } from "@/features/coach/api";
import { useAttendance, useTrainings } from "@/features/me/api";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import type { AttendanceStatus } from "@/shared/constants/domain";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getAttendanceLabel } from "@/shared/utils/status";

export default function AttendanceScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const attendanceQuery = useAttendance(!isCoach);
  const trainingsQuery = useTrainings(!isCoach);
  const coachTrainingsQuery = useCoachTrainings(isCoach);
  const coachTrainings = coachTrainingsQuery.data ?? [];
  const selectedTraining = coachTrainings.find((training) => new Date(training.startsAt).getTime() >= Date.now()) ?? coachTrainings[0];
  const rosterQuery = useCoachAttendanceRoster(isCoach ? selectedTraining?.id : undefined);
  const saveAttendanceMutation = useSaveCoachAttendance(selectedTraining?.id);

  if (isCoach && (coachTrainingsQuery.isLoading || rosterQuery.isLoading)) {
    return <LoadingState label="Yoklama listesi yükleniyor" />;
  }

  if (!isCoach && attendanceQuery.isLoading) {
    return <LoadingState label="Yoklama kayıtları yükleniyor" />;
  }

  if (isCoach) {
    const roster = rosterQuery.data;
    const total = roster?.athletes.length ?? 0;
    const present = roster?.athletes.filter((athlete) => athlete.status === "Present").length ?? 0;
    const absent = roster?.athletes.filter((athlete) => athlete.status === "Absent").length ?? 0;
    const excused = roster?.athletes.filter((athlete) => athlete.status === "Excused" || athlete.status === "Late").length ?? 0;

    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        {!selectedTraining || !roster ? (
          <SurfaceCard>
            <EmptyState title="Antrenman yok" description="Yoklama alınacak aktif antrenman bulunmuyor." />
          </SurfaceCard>
        ) : (
          <>
            <View style={styles.headerBlock}>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.subtitle}>{formatDate(roster.training.startsAt)} • {formatTime(roster.training.startsAt)} Antrenmanı</Text>
              </View>
              <Text style={styles.title}>{roster.training.groupName} Yoklaması</Text>
              <View style={styles.metricsRow}>
                <MetricTile icon="account-group-outline" label="Toplam" value={`${total}`} />
                <MetricTile icon="check-circle-outline" label="Geldi" value={`${present}`} tone="success" />
                <MetricTile icon="close-circle-outline" label="Gelmedi" value={`${absent}`} tone="danger" />
                <MetricTile icon="calendar-remove-outline" label="İzinli" value={`${excused}`} tone="warning" />
              </View>
              <Pressable
                disabled={saveAttendanceMutation.isPending}
                onPress={() => roster.athletes.forEach((athlete) => saveAttendanceMutation.mutate(
                  { athleteProfileId: athlete.athleteProfileId, status: "Present", existing: Boolean(athlete.status) },
                  { onError: () => Alert.alert("Yoklama", "Kayıt güncellenemedi.") }
                ))}
                style={styles.markAllButton}
              >
                <MaterialCommunityIcons name="check-all" size={24} color={colors.onPrimary} />
                <Text style={styles.markAllText}>Tümünü Geldi İşaretle</Text>
              </Pressable>
            </View>

            <View style={styles.rosterList}>
              {roster.athletes.length === 0 ? (
                <SurfaceCard>
                  <EmptyState title="Sporcu yok" description="Bu antrenman grubunda aktif sporcu bulunmuyor." />
                </SurfaceCard>
              ) : (
                roster.athletes.map((athlete) => (
                  <RosterRow
                    key={athlete.athleteProfileId}
                    disabled={saveAttendanceMutation.isPending}
                    name={`${athlete.firstName} ${athlete.lastName}`}
                    meta={athlete.parentFullName}
                    status={athlete.status}
                    onSelect={(status) => saveAttendanceMutation.mutate(
                      { athleteProfileId: athlete.athleteProfileId, status, existing: Boolean(athlete.status) },
                      { onError: () => Alert.alert("Yoklama", "Kayıt güncellenemedi.") }
                    )}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScreenShell>
    );
  }

  const records = attendanceQuery.data ?? [];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "S"} size={42} tone="dark" />}>
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
            const training = trainingsQuery.data?.find((item) => item.id === record.trainingSessionId);
            const tone = record.status === "Present" ? "success" : record.status === "Late" || record.status === "Excused" ? "warning" : "danger";
            return (
              <SurfaceCard key={record.id} style={styles.historyRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.rowTitle}>{training?.title ?? "Antrenman"}</Text>
                  <Text style={styles.rowMeta}>{training ? `${formatDate(training.startsAt)} • ${formatTime(training.startsAt)}` : formatDate(record.recordedAt)}</Text>
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

function RosterRow({ name, meta, status, disabled, onSelect }: { name: string; meta: string; status: AttendanceStatus | null; disabled: boolean; onSelect: (status: AttendanceStatus) => void }) {
  const accent = status === "Present" ? colors.secondaryContainer : status === "Absent" ? colors.errorContainer : status === "Excused" || status === "Late" ? colors.tertiaryFixedDim : colors.primaryFixed;
  return (
    <SurfaceCard style={{ ...styles.rosterCard, borderColor: accent }}>
      <View style={styles.rosterHeader}>
        <InitialsAvatar label={initials(name)} size={58} tone={status === "Absent" ? "red" : "light"} />
        <View style={styles.flexOne}>
          <Text style={styles.athleteName}>{name}</Text>
          <Text style={styles.rowMeta}>{meta}</Text>
        </View>
      </View>
      <View style={styles.segmentControl}>
        <StatusButton disabled={disabled} active={status === "Present"} icon="check" label="Geldi" tone="success" onPress={() => onSelect("Present")} />
        <StatusButton disabled={disabled} active={status === "Absent"} icon="close" label="Gelmedi" tone="danger" onPress={() => onSelect("Absent")} />
        <StatusButton disabled={disabled} active={status === "Excused" || status === "Late"} icon="calendar-remove-outline" label="İzinli" tone="warning" onPress={() => onSelect("Excused")} />
      </View>
    </SurfaceCard>
  );
}

function StatusButton({ active, label, icon, tone, disabled, onPress }: { active: boolean; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: "success" | "danger" | "warning"; disabled: boolean; onPress: () => void }) {
  const backgroundColor = tone === "success" ? colors.secondary : tone === "danger" ? colors.error : colors.tertiaryFixedDim;
  const textColor = tone === "warning" ? colors.onTertiaryFixed : colors.onPrimary;
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.statusButton, active && { backgroundColor }]}>
      <MaterialCommunityIcons name={icon} size={20} color={active ? textColor : colors.onSurfaceVariant} />
      <Text style={[styles.statusText, active && { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  athleteName: { ...typography.title, color: colors.primary },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.lg },
  historyRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  markAllButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  markAllText: { ...typography.title, color: colors.onPrimary },
  metaRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  rosterCard: { gap: spacing.lg },
  rosterHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rosterList: { gap: spacing.md },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  segmentControl: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  statusButton: { alignItems: "center", borderRadius: radius.full, flex: 1, flexDirection: "row", gap: 4, justifyContent: "center", paddingVertical: spacing.md },
  statusText: { ...typography.body, color: colors.onSurfaceVariant },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  title: { ...typography.headline, color: colors.primary }
});
