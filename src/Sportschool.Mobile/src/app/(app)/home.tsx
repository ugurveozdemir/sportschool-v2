import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useMemberAnnouncements, useUnreadAnnouncementCount } from "@/features/announcements/api";
import type { AnnouncementResponse } from "@/features/announcements/types";
import { useCoachSummary } from "@/features/coach/api";
import type { CoachSummaryResponse, CoachTrainingItem } from "@/features/coach/types";
import { useAttendance, useGroups, usePayments, useProfile, useReports, useTrainings } from "@/features/me/api";
import type { AthleteReportResponse, AttendanceResponse, MobileAthleteResponse, TrainingResponse } from "@/features/me/types";
import { EmptyState } from "@/shared/components/EmptyState";
import { CircularScore, InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import type { AttendanceStatus } from "@/shared/constants/domain";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate, formatRelativeDay, formatTime, isSameDay } from "@/shared/utils/date";
import { getAttendanceLabel } from "@/shared/utils/status";

export default function HomeScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const isParent = session?.roles.includes("Parent") ?? false;
  const navItems = getMobileNav(session);
  const shellTitle = getShellTitle(session);
  const { athletes, selectedAthleteProfileId, setSelectedAthleteProfileId } = useAthleteSelection();

  const profileQuery = useProfile(!isCoach, selectedAthleteProfileId);
  const trainingsQuery = useTrainings(!isCoach, undefined, selectedAthleteProfileId);
  const groupsQuery = useGroups(!isCoach, selectedAthleteProfileId);
  const attendanceQuery = useAttendance(!isCoach, selectedAthleteProfileId);
  const paymentsQuery = usePayments(!isCoach, selectedAthleteProfileId);
  const reportsQuery = useReports(!isCoach, selectedAthleteProfileId);
  const announcementsQuery = useMemberAnnouncements(!isCoach, true);
  const unreadCountQuery = useUnreadAnnouncementCount(!isCoach);
  const coachSummaryQuery = useCoachSummary(isCoach);

  if (isCoach) {
    return <CoachHome sessionName={session?.fullName} summary={coachSummaryQuery.data} navItems={navItems} shellTitle={shellTitle} />;
  }

  const profile = profileQuery.data;
  const trainings = trainingsQuery.data ?? [];
  const nextTraining = trainings.find((training) => new Date(training.startsAt).getTime() >= Date.now()) ?? trainings[0];
  const todayTrainingCount = trainings.filter((training) => isSameDay(training.startsAt)).length;
  const payments = paymentsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const unpaidCount = payments.filter((payment) => payment.effectiveStatus !== "Paid").length;
  const reports = reportsQuery.data ?? [];
  const latestReport = reports[0];
  const previousReport = reports[1];

  if (isParent) {
    return (
      <ParentHome
        navItems={navItems}
        shellTitle={shellTitle}
        parentName={session?.fullName?.split(" ")[0] ?? "Veli"}
        childName={profile?.firstName ?? "Sporcu"}
        athletes={athletes}
        selectedAthleteProfileId={selectedAthleteProfileId}
        onSelectAthlete={setSelectedAthleteProfileId}
        nextTraining={nextTraining}
        todayTrainingCount={todayTrainingCount}
        announcements={announcements.slice(0, 2)}
        latestReport={latestReport}
        previousReport={previousReport}
        attendance={attendance}
      />
    );
  }

  return (
    <AthleteHome
      navItems={navItems}
      shellTitle={shellTitle}
      firstName={profile?.firstName ?? "Arda"}
      nextTraining={nextTraining}
      groupCount={groupsQuery.data?.length ?? 0}
      attendance={attendance}
      announcementCount={unreadCountQuery.data?.count ?? 0}
      unpaidCount={unpaidCount}
      latestReport={latestReport}
    />
  );
}

function hasStarted(training: CoachTrainingItem) {
  return new Date(training.startsAt).getTime() <= Date.now();
}

function CoachHome({ sessionName, summary, navItems, shellTitle }: { sessionName?: string; summary?: CoachSummaryResponse; navItems: ReturnType<typeof getMobileNav>; shellTitle: string }) {
  const todayTrainings = summary?.todayTrainings ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);

  const openAttendance = () => {
    if (todayTrainings.length === 0) {
      Alert.alert("Yoklama", "Bugün için planlanmış antrenman bulunmuyor.");
      return;
    }
    if (todayTrainings.length === 1) {
      const only = todayTrainings[0];
      if (!hasStarted(only)) {
        Alert.alert("Yoklama", `Yoklama, antrenman başladığında açılır. Başlangıç: ${formatTime(only.startsAt)}.`);
        return;
      }
      router.push(`/trainings/${only.id}`);
      return;
    }
    setPickerOpen(true);
  };

  const selectTraining = (training: CoachTrainingItem) => {
    setPickerOpen(false);
    router.push(`/trainings/${training.id}`);
  };

  return (
    <ScreenShell title={shellTitle} navItems={navItems}>
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.dateText}>{new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(new Date())}</Text>
          <Text style={styles.displayTitle}>Merhaba, {sessionName?.split(" ")[0] ?? "Koç"}</Text>
        </View>
        <InitialsAvatar label="KÇ" size={54} tone="dark" />
      </View>

      <View style={styles.sectionStack}>
        <SectionTitle title="Bugünkü Etkinlikler" />
        {todayTrainings.length > 0 ? (
          todayTrainings.map((training) => (
            <EventCard
              key={training.id}
              accent="secondary"
              icon="run"
              kicker={`${formatTime(training.startsAt)} • ${training.location ?? "Konum girilmedi"}`}
              title={training.title}
              description={training.notes?.trim() || undefined}
              onPress={() => router.push(`/trainings/${training.id}`)}
            />
          ))
        ) : (
          <SurfaceCard>
            <EmptyState title="Bugün antrenman yok" description="Bugün için atanmış antrenman bulunmuyor." />
          </SurfaceCard>
        )}
      </View>

      <View style={styles.sectionStack}>
        <SectionTitle title="Hızlı Aksiyonlar" />
        <View style={styles.quickGrid}>
          <QuickAction
            label="Yoklama Al"
            icon="clipboard-check-outline"
            primary
            onPress={openAttendance}
          />
          <QuickAction label="Ödeme Kaydet" icon="cash-multiple" tone="green" onPress={() => router.push("/payments")} />
          <QuickAction label="Duyuru Yayınla" icon="bullhorn-outline" tone="dark" onPress={() => router.push("/announcements")} />
        </View>
      </View>

      <AttendancePickerModal
        visible={pickerOpen}
        trainings={todayTrainings}
        onClose={() => setPickerOpen(false)}
        onSelect={selectTraining}
      />
    </ScreenShell>
  );
}

function AttendancePickerModal({ visible, trainings, onClose, onSelect }: { visible: boolean; trainings: CoachTrainingItem[]; onClose: () => void; onSelect: (training: CoachTrainingItem) => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yoklama alınacak antrenman</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={22} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>
          {trainings.map((training) => {
            const started = hasStarted(training);
            const groupNames = training.groups.map((group) => group.name).join(", ");
            return (
              <Pressable
                key={training.id}
                disabled={!started}
                onPress={() => onSelect(training)}
                style={started ? styles.pickerRow : styles.pickerRowDisabled}
              >
                <View style={styles.pickerRowMain}>
                  <Text style={styles.pickerRowTitle}>{training.title}</Text>
                  <Text style={styles.pickerRowMeta}>
                    {formatTime(training.startsAt)} – {formatTime(training.endsAt)}
                    {groupNames ? ` • ${groupNames}` : ""}
                  </Text>
                </View>
                {started ? (
                  <Pill
                    label={training.recordedAttendanceCount >= training.totalAthletes && training.totalAthletes > 0 ? "Tamamlandı" : `${training.recordedAttendanceCount}/${training.totalAthletes}`}
                    tone={training.recordedAttendanceCount >= training.totalAthletes && training.totalAthletes > 0 ? "success" : "neutral"}
                  />
                ) : (
                  <Pill label={`${formatTime(training.startsAt)}'de başlar`} tone="warning" />
                )}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AthleteHome({ navItems, shellTitle, firstName, nextTraining, groupCount, attendance, announcementCount, unpaidCount, latestReport }: { navItems: ReturnType<typeof getMobileNav>; shellTitle: string; firstName: string; nextTraining?: TrainingResponse; groupCount: number; attendance: AttendanceResponse[]; announcementCount: number; unpaidCount: number; latestReport?: AthleteReportResponse }) {
  const stats = attendanceStats(attendance);
  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<InitialsAvatar label={firstName.slice(0, 1)} size={42} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.displayTitle}>Merhaba, {firstName}</Text>
        <Text style={styles.subtitle}>Performansına odaklan, sınırlarını zorla.</Text>
      </View>

      {nextTraining ? (
        <HeroTrainingCard training={nextTraining} />
      ) : (
        <SurfaceCard>
          <EmptyState title="Planlanmış antrenman yok" description="Yaklaşan bir antrenman bulunmuyor." />
        </SurfaceCard>
      )}

      <View style={styles.sectionStack}>
        <SectionTitle title="Hızlı İşlemler" />
        <View style={styles.quickGrid}>
          <QuickAction label="Yoklama\nDurumum" icon="account-check-outline" />
          <QuickAction label="Beslenme\nProgramı" icon="silverware-fork-knife" />
          <QuickAction label="Duyurular" icon="bullhorn-outline" badge={announcementCount > 0} onPress={() => router.push("/announcements")} />
        </View>
      </View>

      <SurfaceCard style={styles.sectionStack}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="chart-line" size={28} color={colors.secondary} />
            <Text style={styles.cardTitle}>Gelişim Özeti</Text>
          </View>
          <Pressable onPress={() => router.push("/development")}>
            <Text style={styles.linkText}>Detaylar</Text>
          </Pressable>
        </View>
        {latestReport ? (
          <View style={styles.scoreRow}>
            <CircularScore label="Hız" value={latestReport.speedScore * 10} color={colors.secondary} />
            <CircularScore label="Teknik" value={latestReport.dribblingScore * 10} color={colors.primary} />
            <CircularScore label="Kondisyon" value={latestReport.strengthScore * 10} color={colors.secondaryFixedDim} />
          </View>
        ) : (
          <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
        )}
      </SurfaceCard>

      <View style={styles.metricsRow}>
        <MetricTile icon="account-group-outline" label="Grup" value={`${groupCount}`} />
        <MetricTile icon="calendar-check-outline" label="Katılım" value={stats.total > 0 ? `%${stats.rate}` : "-"} tone="success" />
        <MetricTile icon="credit-card-clock-outline" label="Borç" value={`${unpaidCount}`} tone={unpaidCount > 0 ? "danger" : "primary"} />
      </View>

      <AttendanceCard stats={stats} />
    </ScreenShell>
  );
}

function ParentHome({ navItems, shellTitle, parentName, childName, athletes, selectedAthleteProfileId, onSelectAthlete, nextTraining, todayTrainingCount, announcements, latestReport, previousReport, attendance }: { navItems: ReturnType<typeof getMobileNav>; shellTitle: string; parentName: string; childName: string; athletes: MobileAthleteResponse[]; selectedAthleteProfileId: string | null; onSelectAthlete: (athleteProfileId: string) => void; nextTraining?: TrainingResponse; todayTrainingCount: number; announcements: AnnouncementResponse[]; latestReport?: AthleteReportResponse; previousReport?: AthleteReportResponse; attendance: AttendanceResponse[] }) {
  const nextTrainingGroup = nextTraining ? trainingGroupName(nextTraining) : null;
  const stats = attendanceStats(attendance);
  const score = latestReport ? round1(averageScore([latestReport.speedScore, latestReport.strengthScore, latestReport.dribblingScore, latestReport.shootingScore])) : null;
  const previousScore = previousReport ? round1(averageScore([previousReport.speedScore, previousReport.strengthScore, previousReport.dribblingScore, previousReport.shootingScore])) : null;
  const trend = score !== null && previousScore !== null ? round1(score - previousScore) : null;
  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<InitialsAvatar label={childName.slice(0, 1)} size={42} tone="light" />}>
      <View style={styles.headerBlockSmallGap}>
        <Text style={styles.parentTitle}>Günaydın, {parentName}</Text>
        <Text style={styles.subtitle}>Bugün {todayTrainingCount > 0 ? `${todayTrainingCount} antrenman` : "antrenman yok"} ve {announcements.length} güncel duyuru var.</Text>
        {athletes.length > 1 ? (
          <View style={styles.childSwitch}>
            {athletes.map((athlete) => {
              const isSelected = athlete.id === selectedAthleteProfileId;
              const name = `${athlete.firstName} ${athlete.lastName}`;
              return (
                <Pressable key={athlete.id} onPress={() => onSelectAthlete(athlete.id)} style={isSelected ? styles.childSwitchActive : styles.childSwitchInactive}>
                  <InitialsAvatar label={athlete.firstName.slice(0, 1)} size={24} tone={isSelected ? "dark" : "light"} />
                  <Text style={isSelected ? styles.childSwitchActiveText : styles.childSwitchText} numberOfLines={1}>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <SurfaceCard style={styles.parentTrainingCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="soccer" size={24} color={colors.secondary} />
            <Text style={styles.parentCardTitle}>Sıradaki Antrenman</Text>
          </View>
          {nextTraining ? (
            <Pill label={formatRelativeDay(nextTraining.startsAt)} tone={isSameDay(nextTraining.startsAt) ? "success" : "neutral"} />
          ) : null}
        </View>
        {nextTraining ? (
          <>
            <Text style={styles.smallMeta}>{[nextTrainingGroup, nextTraining.title].filter(Boolean).join(" • ")}</Text>
            <View style={styles.parentInfoBox}>
              <InitialsAvatar label="◷" size={48} tone="dark" />
              <View>
                <Text style={styles.kickerDark}>Zaman</Text>
                <Text style={styles.infoTitle}>{formatRelativeDay(nextTraining.startsAt)} • {formatTime(nextTraining.startsAt)} - {formatTime(nextTraining.endsAt)}</Text>
              </View>
            </View>
            {nextTraining.location ? (
              <View style={styles.parentInfoBox}>
                <InitialsAvatar label="⌖" size={48} tone="light" />
                <View>
                  <Text style={styles.kickerDark}>Tesis</Text>
                  <Text style={styles.infoTitle}>{nextTraining.location}</Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <EmptyState title="Planlanmış antrenman yok" description="Yaklaşan bir antrenman bulunmuyor." />
        )}
      </SurfaceCard>

      <View style={styles.darkScoreCard}>
        <Text style={styles.darkCardTitle}>Gelişim Özeti</Text>
        {latestReport && score !== null ? (
          <>
            <Text style={styles.darkSubtitle}>Genel performans puanı</Text>
            <View style={styles.scoreInline}>
              <Text style={styles.largeWhite}>{score.toFixed(1)}</Text>
              {trend !== null && trend > 0 ? <Text style={styles.greenText}>↗ {trend.toFixed(1)} puan</Text> : null}
              {trend !== null && trend < 0 ? <Text style={styles.redText}>↘ {Math.abs(trend).toFixed(1)} puan</Text> : null}
            </View>
            <Progress label="Hız" value={latestReport.speedScore * 10} />
            <Progress label="Teknik" value={latestReport.dribblingScore * 10} light />
          </>
        ) : (
          <Text style={styles.darkSubtitle}>Henüz gelişim raporu bulunmuyor.</Text>
        )}
      </View>

      <AttendanceCard stats={stats} />

      <SurfaceCard style={styles.noPaddingCard}>
          <View style={styles.cardInsetHeader}>
            <Text style={styles.parentCardTitle}>Kulüp Duyuruları</Text>
            <Pressable onPress={() => router.push("/announcements")}>
              <Text style={styles.linkText}>Tümünü Gör</Text>
            </Pressable>
          </View>
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <AnnouncementItem
              date={announcement.expiresAt ? `Bitiş: ${new Date(announcement.expiresAt).toLocaleDateString("tr-TR")}` : "Süresiz"}
              dotColor={announcement.isNew ? colors.secondary : colors.outlineVariant}
              key={announcement.id}
              text={announcement.content}
              title={announcement.title}
            />
          ))
        ) : (
          <View style={styles.emptyAnnouncement}>
            <Text style={styles.rowMeta}>Güncel duyuru bulunmuyor.</Text>
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionStack}>
        <Text style={styles.parentCardTitle}>Finansal Durum</Text>
        <EmptyState title="Çok yakında" description="Finansal takip özelliği üzerinde çalışıyoruz." />
      </SurfaceCard>
    </ScreenShell>
  );
}

type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
  excused: number;
  rate: number;
  recent: AttendanceResponse[];
};

function attendanceStats(records: AttendanceResponse[]): AttendanceStats {
  const present = records.filter((record) => record.status === "Present" || record.status === "Late").length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const excused = records.filter((record) => record.status === "Excused").length;
  const total = records.length;
  return {
    total,
    present,
    absent,
    excused,
    rate: total > 0 ? Math.round((present / total) * 100) : 0,
    recent: records.slice(0, 5)
  };
}

function attendanceTone(status: AttendanceStatus): "success" | "danger" | "neutral" {
  if (status === "Present" || status === "Late") {
    return "success";
  }
  return status === "Absent" ? "danger" : "neutral";
}

function AttendanceCard({ stats }: { stats: AttendanceStats }) {
  return (
    <SurfaceCard style={styles.sectionStack}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconTitleRow}>
          <MaterialCommunityIcons name="calendar-check-outline" size={26} color={colors.secondary} />
          <Text style={styles.cardTitle}>Katılım</Text>
        </View>
        {stats.total > 0 ? <Text style={styles.attendanceRate}>%{stats.rate}</Text> : null}
      </View>
      {stats.total === 0 ? (
        <EmptyState title="Kayıt yok" description="Henüz yoklama kaydı bulunmuyor." />
      ) : (
        <>
          <Text style={styles.subtitle}>Son {stats.total} antrenmanın {stats.present} tanesine katıldın.</Text>
          <View style={styles.attendanceStatsRow}>
            <AttendanceStat label="Geldi" value={stats.present} color={colors.secondary} />
            <AttendanceStat label="Gelmedi" value={stats.absent} color={colors.error} />
            <AttendanceStat label="Mazeret" value={stats.excused} color={colors.outline} />
          </View>
          <View style={styles.attendanceList}>
            {stats.recent.map((record) => (
              <View key={record.id} style={styles.attendanceRow}>
                <Text style={styles.attendanceDate}>{formatDate(record.recordedAt)}</Text>
                <Pill label={getAttendanceLabel(record.status)} tone={attendanceTone(record.status)} />
              </View>
            ))}
          </View>
        </>
      )}
    </SurfaceCard>
  );
}

function AttendanceStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.attendanceStat}>
      <Text style={[styles.attendanceStatValue, { color }]}>{value}</Text>
      <Text style={styles.attendanceStatLabel}>{label}</Text>
    </View>
  );
}

function EventCard({ accent, icon, kicker, title, description, onPress }: {
  accent: "primary" | "secondary";
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  kicker: string;
  title: string;
  description?: string;
  onPress?: () => void;
}) {
  const content = (
    <SurfaceCard accent={accent} style={styles.eventCard}>
      <View style={styles.eventIconCircle}>
        <MaterialCommunityIcons name={icon} size={28} color={accent === "secondary" ? colors.secondary : colors.primary} />
      </View>
      <View style={styles.flexOne}>
        <Text style={[styles.eventKicker, accent === "secondary" && styles.greenText]}>{kicker}</Text>
        <Text style={styles.eventTitle}>{title}</Text>
        {description ? <Text style={styles.eventDescription}>{description}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={30} color={colors.outlineVariant} />
    </SurfaceCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} detayını aç`} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function QuickAction({ label, icon, primary, badge, tone, onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; primary?: boolean; badge?: boolean; tone?: "green" | "dark"; onPress?: () => void }) {
  const highlighted = primary || tone;
  const content = (
    <>
      {badge ? <View style={styles.smallRedDot} /> : null}
      <View style={[styles.quickIconCircle, highlighted && styles.quickIconHighlight]}>
        <MaterialCommunityIcons name={icon} size={26} color={highlighted ? colors.onPrimary : colors.primary} />
      </View>
      <Text style={[styles.quickText, highlighted && styles.quickTextPrimary]}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.quickAction, primary && styles.quickActionPrimary, tone === "green" && styles.quickActionGreen, tone === "dark" && styles.quickActionDark]}>{content}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.quickAction, primary && styles.quickActionPrimary, tone === "green" && styles.quickActionGreen, tone === "dark" && styles.quickActionDark]}>
      {content}
    </Pressable>
  );
}

function HeroTrainingCard({ training }: { training: TrainingResponse }) {
  const groupName = trainingGroupName(training);
  return (
    <View style={styles.heroCard}>
      <MaterialCommunityIcons name="soccer" size={190} color="rgba(255,255,255,0.09)" style={styles.heroIcon} />
      <View style={styles.iconTitleRow}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.secondaryContainer} />
        <Text style={styles.heroKicker}>Sıradaki Antrenman</Text>
      </View>
      <Text style={styles.heroTitle}>{training.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.heroText}>◷ {formatRelativeDay(training.startsAt)} • {formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
        {training.location ? <Text style={styles.heroText}>⌖ {training.location}</Text> : null}
        {groupName ? <Text style={styles.heroText}>♟ {groupName}</Text> : null}
      </View>
    </View>
  );
}

function trainingGroupName(training: TrainingResponse) {
  return training.groups.map((group) => group.name).join(", ") || null;
}

function Progress({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressLabel}>{value}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: light ? colors.primaryFixed : colors.secondaryContainer }]} />
      </View>
    </View>
  );
}

function AnnouncementItem({ dotColor, title, text, date }: { dotColor: string; title: string; text: string; date: string }) {
  return (
    <View style={styles.announcementItem}>
      <View style={[styles.announcementDot, { backgroundColor: dotColor }]} />
      <View style={styles.flexOne}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{text}</Text>
        <Text style={styles.dateSmall}>{date}</Text>
      </View>
    </View>
  );
}

function averageScore(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

const styles = StyleSheet.create({
  announcementDot: { borderRadius: 4, height: 8, marginTop: 7, width: 8 },
  announcementItem: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  attendanceRate: { ...typography.headline, color: colors.secondary },
  attendanceStatsRow: { flexDirection: "row", gap: spacing.sm },
  attendanceStat: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flex: 1, gap: spacing.xs, paddingVertical: spacing.md },
  attendanceStatValue: { ...typography.headline },
  attendanceStatLabel: { ...typography.label, color: colors.onSurfaceVariant },
  attendanceList: { gap: spacing.sm },
  attendanceRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  attendanceDate: { ...typography.body, color: colors.onSurface },
  cardHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardInsetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  cardTitle: { ...typography.headline, color: colors.primary },
  childSwitch: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  childSwitchActive: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.sm },
  childSwitchActiveText: { ...typography.label, color: colors.onPrimary },
  childSwitchInactive: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.sm },
  childSwitchText: { ...typography.label, color: colors.onSurfaceVariant },
  darkCardTitle: { ...typography.title, color: colors.onPrimary },
  darkScoreCard: { backgroundColor: colors.primary, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.lg },
  darkSubtitle: { ...typography.body, color: colors.primaryFixedDim },
  dateSmall: { ...typography.label, color: colors.outline, marginTop: spacing.sm },
  dateText: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginBottom: 4 },
  displayTitle: { ...typography.display, color: colors.primary },
  emptyAnnouncement: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, padding: spacing.lg },
  eventCard: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingLeft: spacing.xl },
  eventIconCircle: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 62, justifyContent: "center", width: 62 },
  eventDescription: { ...typography.body, color: colors.onSurfaceVariant, marginTop: 3 },
  eventKicker: { ...typography.label, color: colors.primary, textTransform: "uppercase" },
  eventTitle: { ...typography.headline, color: colors.primary },
  flexOne: { flex: 1 },
  greenText: { color: colors.secondary },
  headerBlock: { gap: spacing.sm },
  headerBlockSmallGap: { gap: spacing.sm },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, gap: spacing.sm, overflow: "hidden", padding: spacing.xl },
  heroIcon: { position: "absolute", right: -38, top: -22 },
  heroKicker: { ...typography.label, color: colors.secondaryContainer, textTransform: "uppercase" },
  heroText: { ...typography.bodyLarge, color: colors.primaryFixedDim },
  heroTitle: { ...typography.headline, color: colors.onPrimary },
  iconTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  infoTitle: { ...typography.title, color: colors.primary },
  kickerDark: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  largeWhite: { ...typography.display, color: colors.onPrimary, fontSize: 48, lineHeight: 56 },
  linkText: { ...typography.label, color: colors.primary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(11,28,48,0.45)", flex: 1, justifyContent: "center", padding: spacing.lg },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  modalSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.lg, width: "100%" },
  modalTitle: { ...typography.headline, color: colors.primary },
  mutedBold: { ...typography.title, color: colors.outline },
  noPaddingCard: { padding: 0 },
  parentCardTitle: { ...typography.title, color: colors.primary },
  parentInfoBox: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceContainerHigh, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  parentTitle: { ...typography.headline, color: colors.primary },
  parentTrainingCard: { backgroundColor: "rgba(232,255,243,0.45)", gap: spacing.md },
  pickerRow: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.md },
  pickerRowDisabled: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", opacity: 0.55, padding: spacing.md },
  pickerRowMain: { flex: 1, gap: 2 },
  pickerRowMeta: { ...typography.label, color: colors.onSurfaceVariant },
  pickerRowTitle: { ...typography.title, color: colors.onSurface },
  progressFill: { borderRadius: radius.full, height: "100%" },
  progressLabel: { ...typography.label, color: colors.onPrimary },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.full, height: 7, overflow: "hidden" },
  progressWrap: { gap: 4 },
  quickAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.sm, minHeight: 130, justifyContent: "center", padding: spacing.sm },
  quickActionDark: { backgroundColor: "#2f343d", borderColor: "#2f343d" },
  quickActionGreen: { backgroundColor: "#00472d", borderColor: "#00472d" },
  quickActionPrimary: { backgroundColor: colors.primary },
  quickGrid: { flexDirection: "row", gap: spacing.md },
  quickIconCircle: { alignItems: "center", backgroundColor: colors.primaryFixed, borderRadius: radius.full, height: 54, justifyContent: "center", width: 54 },
  quickIconHighlight: { backgroundColor: "rgba(255,255,255,0.16)" },
  quickText: { ...typography.label, color: colors.primary, fontSize: 14, lineHeight: 18, textAlign: "center" },
  quickTextPrimary: { color: colors.onPrimary },
  redText: { color: colors.errorContainer },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.bodyLarge, color: colors.primary },
  scoreInline: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm },
  scoreRow: { flexDirection: "row", justifyContent: "space-around" },
  sectionStack: { gap: spacing.lg },
  separator: { backgroundColor: colors.borderSoft, height: 1 },
  smallMeta: { ...typography.body, color: colors.onSurfaceVariant },
  smallRedDot: { backgroundColor: colors.error, borderRadius: 5, height: 10, position: "absolute", right: spacing.md, top: spacing.md, width: 10 },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  welcomeRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }
});
