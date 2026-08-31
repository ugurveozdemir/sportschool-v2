import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useMemberAnnouncements, useUnreadAnnouncementCount } from "@/features/announcements/api";
import type { AnnouncementResponse } from "@/features/announcements/types";
import { useCoachSummary, useCoachTrainings } from "@/features/coach/api";
import type { CoachSummaryResponse, CoachTrainingItem } from "@/features/coach/types";
import { useAttendance, useDevelopmentSummary, useGroups, useNextTraining, usePayments, useProfile, useTrainings } from "@/features/me/api";
import { ParentAthleteSelector, SelectedAthleteAvatar } from "@/features/me/ParentAthleteSelector";
import type { AttendanceResponse, DevelopmentMetricAverages, DevelopmentSummaryResponse, PaymentResponse, TrainingResponse } from "@/features/me/types";
import { getErrorMessage } from "@/shared/api/apiError";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ProfileAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import type { AttendanceStatus } from "@/shared/constants/domain";
import { colors } from "@/shared/design/colors";
import { useResponsiveLayout } from "@/shared/design/responsive";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate, formatRelativeDay, formatTime, isSameDay } from "@/shared/utils/date";
import { formatMoney } from "@/shared/utils/money";
import { getAttendanceLabel } from "@/shared/utils/status";

export default function HomeScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const isSchoolAdmin = session?.loginRole === "SchoolAdmin";
  const isCoach = session?.loginRole === "Coach" || isSchoolAdmin;
  const isParent = session?.loginRole === "Parent";
  const navItems = getMobileNav(session);
  const shellTitle = getShellTitle(session);
  const { selectedAthleteProfileId } = useAthleteSelection();

  const profileQuery = useProfile(!isCoach, selectedAthleteProfileId);
  const trainingsQuery = useTrainings(isParent, undefined, selectedAthleteProfileId);
  const nextTrainingQuery = useNextTraining(!isCoach, selectedAthleteProfileId);
  const groupsQuery = useGroups(!isCoach, selectedAthleteProfileId);
  const attendanceQuery = useAttendance(!isCoach, selectedAthleteProfileId);
  const developmentQuery = useDevelopmentSummary(!isCoach, selectedAthleteProfileId);
  const paymentsQuery = usePayments(isParent, selectedAthleteProfileId);
  const announcementsQuery = useMemberAnnouncements(!isCoach, true);
  const unreadCountQuery = useUnreadAnnouncementCount(!isCoach);
  const coachSummaryQuery = useCoachSummary(isCoach);
  const coachTrainingsQuery = useCoachTrainings(isCoach);
  const { refetch: refetchProfile } = profileQuery;
  const { refetch: refetchTrainings } = trainingsQuery;
  const { refetch: refetchNextTraining } = nextTrainingQuery;
  const { refetch: refetchPayments } = paymentsQuery;

  useFocusEffect(useCallback(() => {
    if (isCoach) {
      return;
    }

    void refetchProfile();
    void refetchNextTraining();
    if (isParent) {
      void refetchTrainings();
      void refetchPayments();
    }
    void queryClient.refetchQueries({ queryKey: ["me", "athletes"], type: "active" });
  }, [isCoach, isParent, queryClient, refetchNextTraining, refetchPayments, refetchProfile, refetchTrainings]));

  if (isCoach) {
    if (coachSummaryQuery.isLoading || coachTrainingsQuery.isLoading) {
      return <LoadingState label="Ana sayfa yükleniyor" />;
    }

    const coachError = coachSummaryQuery.isError ? coachSummaryQuery.error : coachTrainingsQuery.error;
    if (coachError) {
      return <ErrorState
        title="Ana sayfa yüklenemedi"
        description={getErrorMessage(coachError, "Akademi verileri şu an alınamadı.")}
        onRetry={() => {
          void coachSummaryQuery.refetch();
          void coachTrainingsQuery.refetch();
        }}
      />;
    }

    return (
      <CoachHome
        isSchoolAdmin={isSchoolAdmin}
        navItems={navItems}
        sessionName={session?.fullName}
        shellTitle={shellTitle}
        summary={coachSummaryQuery.data}
        trainings={coachTrainingsQuery.data ?? []}
      />
    );
  }

  const memberQueries = isParent
    ? [profileQuery, trainingsQuery, nextTrainingQuery, groupsQuery, attendanceQuery, developmentQuery, paymentsQuery, announcementsQuery, unreadCountQuery]
    : [profileQuery, nextTrainingQuery, groupsQuery, attendanceQuery, developmentQuery, announcementsQuery, unreadCountQuery];
  if (memberQueries.some((query) => query.isLoading)) {
    return <LoadingState label="Ana sayfa yükleniyor" />;
  }

  const memberError = memberQueries.find((query) => query.isError)?.error;
  if (memberError) {
    return <ErrorState
      title="Ana sayfa yüklenemedi"
      description={getErrorMessage(memberError, "Sporcu verileri şu an alınamadı.")}
      onRetry={() => {
        void Promise.all(memberQueries.map((query) => query.refetch()));
      }}
    />;
  }

  const profile = profileQuery.data;
  const trainings = trainingsQuery.data ?? [];
  const nextTraining = nextTrainingQuery.data ?? undefined;
  const todayTrainingCount = trainings.filter((training) => isSameDay(training.startsAt)).length;
  const announcements = announcementsQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const developmentSummary = developmentQuery.data;

  if (isParent) {
    return (
      <ParentHome
        navItems={navItems}
        shellTitle={shellTitle}
        parentName={session?.fullName?.split(" ")[0] ?? "Veli"}
        childName={profile?.firstName ?? "Sporcu"}
        nextTraining={nextTraining}
        todayTrainingCount={todayTrainingCount}
        announcements={announcements.slice(0, 2)}
        currentAnnouncementCount={announcements.length}
        unreadAnnouncementCount={unreadCountQuery.data?.count ?? 0}
        developmentSummary={developmentSummary}
        attendance={attendance}
        payments={paymentsQuery.data}
      />
    );
  }

  return (
    <AthleteHome
      navItems={navItems}
      shellTitle={shellTitle}
      firstName={profile?.firstName ?? "Sporcu"}
      profileImageUrl={profile?.profileImageUrl}
      nextTraining={nextTraining}
      groupCount={groupsQuery.data?.length ?? 0}
      attendance={attendance}
      announcementCount={unreadCountQuery.data?.count ?? 0}
    />
  );
}

function hasStarted(training: CoachTrainingItem) {
  return new Date(training.startsAt).getTime() <= Date.now();
}

function isNextTraining(training: { endsAt: string; completedAt: string | null }) {
  return training.completedAt === null
    && new Date(training.endsAt).getTime() >= Date.now();
}

function isTrainingInProgress(training: { startsAt: string; endsAt: string; completedAt: string | null }) {
  const now = Date.now();
  return training.completedAt === null
    && new Date(training.startsAt).getTime() <= now
    && new Date(training.endsAt).getTime() >= now;
}

function getInitials(value?: string) {
  const initials = value?.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2);
  return initials?.toLocaleUpperCase("tr-TR") || "A";
}

function CoachHome({ sessionName, summary, trainings, navItems, shellTitle, isSchoolAdmin }: { sessionName?: string; summary?: CoachSummaryResponse; trainings: CoachTrainingItem[]; navItems: ReturnType<typeof getMobileNav>; shellTitle: string; isSchoolAdmin: boolean }) {
  const todayTrainings = summary?.todayTrainings ?? [];
  const nextTraining = trainings.find(isNextTraining);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { isCompact } = useResponsiveLayout();

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
      <View style={[styles.coachWelcome, isCompact && styles.coachWelcomeCompact]}>
        <InitialsAvatar label={getInitials(sessionName)} size={isCompact ? 44 : 54} tone="dark" />
        <View style={styles.flexOne}>
          <Text style={[styles.coachWelcomeTitle, isCompact && styles.coachWelcomeTitleCompact]}>Hoş Geldin, {isSchoolAdmin ? "Yönetici" : "Antrenör"}</Text>
          <Text style={[styles.coachWelcomeName, isCompact && styles.coachWelcomeNameCompact]}>{sessionName ?? "Akademi Ekibi"}</Text>
        </View>
      </View>

      <View style={[styles.coachSectionHeader, isCompact && styles.coachSectionHeaderCompact]}>
        <Text style={[styles.coachSectionTitle, isCompact && styles.coachSectionTitleCompact]}>Sıradaki Antrenman</Text>
        <Pressable onPress={() => router.push("/calendar")} style={styles.coachSectionLink}>
          <Text style={styles.coachSectionLinkText}>Antrenman Programı</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryContainer} />
        </Pressable>
      </View>

      {nextTraining ? (
        <CoachTrainingHero training={nextTraining} />
      ) : (
        <SurfaceCard style={styles.coachEmptyCard}>
          <EmptyState title="Yaklaşan antrenman yok" description="Önümüzdeki 14 gün için atanmış antrenman bulunmuyor." />
          <Pressable onPress={() => router.push("/calendar")} style={styles.coachOutlineButton}>
            <Text style={styles.coachOutlineButtonText}>Antrenman programını aç</Text>
          </Pressable>
        </SurfaceCard>
      )}

      <View style={[styles.homeMenu, isCompact && styles.homeMenuCompact]}>
        <HomeMenuAction
          icon="clipboard-check-outline"
          label="YOKLAMA AL"
          onPress={openAttendance}
        />
        <HomeMenuAction
          highlighted
          icon="soccer"
          label="ANTRENMANLAR"
          onPress={() => router.push("/calendar")}
        />
        <HomeMenuAction
          icon="chart-box-outline"
          label="RAPORLAMA"
          onPress={() => router.push("/attendance")}
        />
        <HomeMenuAction
          highlighted
          icon="cash-multiple"
          label="ÖDEMELER"
          onPress={() => router.push("/payments")}
        />
        <HomeMenuAction
          icon="bullhorn-outline"
          label="DUYURULAR"
          onPress={() => router.push("/announcements")}
        />
        <HomeMenuAction
          highlighted
          icon="play-box-multiple-outline"
          label="VİDEOLAR"
          onPress={() => router.push("/feed")}
        />
      </View>

      <View style={styles.coachStats}>
        <View style={styles.coachStat}>
          <Text style={styles.coachStatValue}>{summary?.weekTrainingCount ?? 0}</Text>
          <Text style={styles.coachStatLabel}>BU HAFTA ANTRENMAN</Text>
        </View>
        <View style={styles.coachStatDivider} />
        <View style={styles.coachStat}>
          <Text style={styles.coachStatValue}>{summary?.athleteCount ?? 0}</Text>
          <Text style={styles.coachStatLabel}>AKTİF SPORCU</Text>
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

function CoachTrainingHero({ training }: { training: CoachTrainingItem }) {
  const date = new Date(training.startsAt);
  const day = new Intl.DateTimeFormat("tr-TR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(date).replace(".", "");
  const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date);
  const groups = training.groups.map((group) => group.name).join(", ");
  const inProgress = isTrainingInProgress(training);
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.coachHero, isCompact && styles.coachHeroCompact]}>
      <View style={styles.coachHeroGlow} />
      <View style={[styles.coachHeroDate, isCompact && styles.coachHeroDateCompact]}>
        <Text style={[styles.coachHeroDateText, isCompact && styles.coachHeroDateTextCompact]}>{day} {month}</Text>
        <Text style={[styles.coachHeroTime, isCompact && styles.coachHeroTimeCompact]}>{formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
      </View>
      <Text style={[styles.coachHeroWeekday, isCompact && styles.coachHeroWeekdayCompact]}>{inProgress ? "DEVAM EDEN ANTRENMAN" : weekday.toLocaleUpperCase("tr-TR")}</Text>
      <View style={[styles.coachHeroDetails, isCompact && styles.coachHeroDetailsCompact]}>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Antrenman</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {training.title}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Sporcu Grubu</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {groups || "Grup atanmamış"}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Sporcu Sayısı</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {training.totalAthletes}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Konum</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {training.location ?? "Belirtilmedi"}</Text>
        </View>
      </View>
      <Pressable onPress={() => router.push(`/trainings/${training.id}`)} style={[styles.coachHeroButton, isCompact && styles.coachHeroButtonCompact]}>
        <Text style={[styles.coachHeroButtonText, isCompact && styles.coachHeroButtonTextCompact]}>Detayı Gör</Text>
        <MaterialCommunityIcons name="arrow-right" size={isCompact ? 21 : 24} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

function HomeMenuAction({
  highlighted = false,
  icon,
  label,
  onPress
}: {
  highlighted?: boolean;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { isCompact } = useResponsiveLayout();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.homeMenuAction,
        isCompact && styles.homeMenuActionCompact,
        highlighted && styles.homeMenuActionHighlighted,
        pressed && styles.homeMenuActionPressed
      ]}
    >
      <View style={[styles.homeMenuIcon, isCompact && styles.homeMenuIconCompact, highlighted && styles.homeMenuIconHighlighted]}>
        <MaterialCommunityIcons
          name={icon}
          size={isCompact ? 22 : 25}
          color={highlighted ? colors.onPrimary : colors.onSurface}
        />
      </View>
      <Text style={[styles.homeMenuLabel, isCompact && styles.homeMenuLabelCompact, highlighted && styles.homeMenuLabelHighlighted]}>{label}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={isCompact ? 22 : 24}
        color={highlighted ? colors.onPrimary : colors.onSurfaceVariant}
      />
    </Pressable>
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
                    label={training.recordedAttendanceCount >= training.totalAthletes && training.totalAthletes > 0 ? "Yoklama tamam" : `${training.recordedAttendanceCount}/${training.totalAthletes} girildi`}
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

function AthleteHome({ navItems, shellTitle, firstName, profileImageUrl, nextTraining, groupCount, attendance, announcementCount }: { navItems: ReturnType<typeof getMobileNav>; shellTitle: string; firstName: string; profileImageUrl?: string | null; nextTraining?: TrainingResponse; groupCount: number; attendance: AttendanceResponse[]; announcementCount: number }) {
  const stats = attendanceStats(attendance);
  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<ProfileAvatar uri={profileImageUrl ? resolveApiUrl(profileImageUrl) : null} label={firstName.slice(0, 1)} size={38} tone="dark" />}>
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

      <View style={styles.homeMenu}>
        <HomeMenuAction
          highlighted
          icon="calendar-month-outline"
          label="ANTRENMANLAR"
          onPress={() => router.push("/calendar")}
        />
        <HomeMenuAction
          icon="account-check-outline"
          label="KATILIMIM"
          onPress={() => router.push("/attendance")}
        />
        <HomeMenuAction
          highlighted
          icon="bullhorn-outline"
          label={announcementCount > 0 ? `DUYURULAR  •  ${announcementCount} YENİ` : "DUYURULAR"}
          onPress={() => router.push("/announcements")}
        />
        <HomeMenuAction
          icon="play-box-multiple-outline"
          label="VİDEOLAR"
          onPress={() => router.push("/feed")}
        />
      </View>

      <View style={styles.metricsRow}>
        <MetricTile icon="account-group-outline" label="Grup" value={`${groupCount}`} />
        <MetricTile icon="calendar-check-outline" label="Katılım" value={stats.total > 0 ? `%${stats.rate}` : "-"} tone="success" />
      </View>

      <AttendanceCard stats={stats} />
    </ScreenShell>
  );
}

type ParentHomeProps = {
  navItems: ReturnType<typeof getMobileNav>;
  shellTitle: string;
  parentName: string;
  childName: string;
  nextTraining?: TrainingResponse;
  todayTrainingCount: number;
  announcements: AnnouncementResponse[];
  currentAnnouncementCount: number;
  unreadAnnouncementCount: number;
  developmentSummary?: DevelopmentSummaryResponse;
  attendance: AttendanceResponse[];
  payments?: PaymentResponse[];
};

function ParentHome({ navItems, shellTitle, parentName, childName, nextTraining, todayTrainingCount, announcements, currentAnnouncementCount, unreadAnnouncementCount, developmentSummary, attendance, payments }: ParentHomeProps) {
  const nextTrainingGroup = nextTraining ? trainingGroupName(nextTraining) : null;
  const stats = attendanceStats(attendance);
  const score = developmentSummary?.averages ? averageMetrics(developmentSummary.averages) : null;
  const totalDue = payments?.reduce((sum, payment) => sum + (payment.effectiveStatus === "Paid" ? 0 : payment.balance), 0);
  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<SelectedAthleteAvatar />}>
      <View style={styles.headerBlockSmallGap}>
        <Text style={styles.parentTitle}>Merhaba, {parentName}</Text>
        <Text style={styles.subtitle}>Bugün {todayTrainingCount > 0 ? `${todayTrainingCount} antrenman` : "antrenman yok"} ve {currentAnnouncementCount} güncel duyuru var.</Text>
      </View>

      <ParentAthleteSelector />

      <Pressable onPress={() => router.push("/calendar")}>
        <SurfaceCard accent="secondary" style={styles.parentTrainingCard}>
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
                <InitialsAvatar label="◷" size={42} tone="dark" />
                <View style={styles.flexOne}>
                  <Text style={styles.kickerDark}>Zaman</Text>
                  <Text style={styles.infoTitle}>{formatRelativeDay(nextTraining.startsAt)} • {formatTime(nextTraining.startsAt)} - {formatTime(nextTraining.endsAt)}</Text>
                </View>
              </View>
              {nextTraining.location ? (
                <View style={styles.parentInfoBox}>
                  <InitialsAvatar label="⌖" size={42} tone="light" />
                  <View style={styles.flexOne}>
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
      </Pressable>

      <View style={styles.parentStatusGrid}>
        <ParentStatusCard icon="calendar-check-outline" label="Katılım" value={stats.total > 0 ? `%${stats.rate}` : "-"} tone="success" onPress={() => router.push("/attendance")} />
        <ParentStatusCard icon="chart-line" label="Gelişim" value={score !== null ? score.toFixed(0) : "-"} tone="primary" onPress={() => router.push("/development")} />
        <ParentStatusCard icon="cash-multiple" label="Aidat" value={totalDue === undefined ? "-" : totalDue > 0 ? formatMoney(totalDue) : "Tamam"} tone={totalDue && totalDue > 0 ? "danger" : "success"} onPress={() => router.push("/payments")} />
        <ParentStatusCard icon="bullhorn-outline" label="Yeni duyuru" value={`${unreadAnnouncementCount}`} tone={unreadAnnouncementCount > 0 ? "primary" : "neutral"} onPress={() => router.push("/announcements")} />
      </View>

      <Pressable onPress={() => router.push("/development")}>
        <SurfaceCard accent="primary" style={styles.developmentCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Gelişim Özeti</Text>
            <Text style={styles.linkText}>Detaylar</Text>
          </View>
          {developmentSummary?.averages && score !== null ? (
            <>
              <Text style={styles.developmentSubtitle}>Genel performans puanı</Text>
              <Text style={styles.developmentScore}>{score.toFixed(1)}</Text>
              <Progress label="Teknik" value={developmentSummary.averages.technicalDevelopment} />
              <Progress label="Kondisyon" value={developmentSummary.averages.physicalCondition} light />
            </>
          ) : (
            <Text style={styles.developmentSubtitle}>Henüz gelişim raporu bulunmuyor.</Text>
          )}
        </SurfaceCard>
      </Pressable>

      <AttendanceCard stats={stats} subjectName={childName} onPress={() => router.push("/attendance")} />

      <View style={styles.parentQuickActions}>
        <ParentQuickAction icon="play-box-multiple-outline" label="Videolar" onPress={() => router.push("/feed")} />
        <ParentQuickAction icon="bullhorn-outline" label="Duyurular" onPress={() => router.push("/announcements")} />
        <ParentQuickAction icon="account-outline" label="Sporcu Profili" onPress={() => router.push("/profile")} />
      </View>

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
    </ScreenShell>
  );
}

type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
  rate: number;
  recent: AttendanceResponse[];
};

function attendanceStats(records: AttendanceResponse[]): AttendanceStats {
  const present = records.filter((record) => record.status === "Present").length;
  const absent = records.filter((record) => record.status === "Absent").length;
  const recent = records.filter((record) => record.status !== null);
  const total = recent.length;
  return {
    total,
    present,
    absent,
    rate: total > 0 ? Math.round((present / total) * 100) : 0,
    recent: recent.slice(0, 5)
  };
}

function attendanceTone(status: AttendanceStatus | null): "success" | "danger" | "neutral" {
  if (status === "Present") {
    return "success";
  }
  return status === "Absent" ? "danger" : "neutral";
}

function AttendanceCard({ stats, subjectName, onPress }: { stats: AttendanceStats; subjectName?: string; onPress?: () => void }) {
  return (
    <SurfaceCard style={styles.sectionStack}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconTitleRow}>
          <MaterialCommunityIcons name="calendar-check-outline" size={26} color={colors.secondary} />
          <Text style={styles.cardTitle}>Katılım</Text>
        </View>
        <View style={styles.cardHeaderAction}>
          {stats.total > 0 ? <Text style={styles.attendanceRate}>%{stats.rate}</Text> : null}
          {onPress ? (
            <Pressable onPress={onPress}>
              <Text style={styles.linkText}>Detaylar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      {stats.total === 0 ? (
        <EmptyState title="Kayıt yok" description="Henüz yoklama kaydı bulunmuyor." />
      ) : (
        <>
          <Text style={styles.subtitle}>{subjectName ? `${subjectName}, son ${stats.total} antrenmanın ${stats.present} tanesine katıldı.` : `Son ${stats.total} antrenmanın ${stats.present} tanesine katıldın.`}</Text>
          <View style={styles.attendanceStatsRow}>
            <AttendanceStat label="Geldi" value={stats.present} color={colors.secondary} />
            <AttendanceStat label="Gelmedi" value={stats.absent} color={colors.error} />
          </View>
          <View style={styles.attendanceList}>
            {stats.recent.map((record) => (
              record.status === null ? null : (
                <View key={record.id} style={styles.attendanceRow}>
                  <Text style={styles.attendanceDate}>{record.recordedAt ? formatDate(record.recordedAt) : "Tarih yok"}</Text>
                  <Pill label={getAttendanceLabel(record.status)} tone={attendanceTone(record.status)} />
                </View>
              )
            ))}
          </View>
        </>
      )}
    </SurfaceCard>
  );
}

function ParentStatusCard({ icon, label, value, tone, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone: "primary" | "success" | "danger" | "neutral"; onPress: () => void }) {
  const color = tone === "success" ? colors.secondary : tone === "danger" ? colors.error : tone === "primary" ? colors.primaryContainer : colors.onSurfaceVariant;
  return (
    <Pressable onPress={onPress} style={styles.parentStatusPressable}>
      <SurfaceCard style={styles.parentStatusCard}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
        <Text numberOfLines={1} style={[styles.parentStatusValue, { color }]}>{value}</Text>
        <Text style={styles.parentStatusLabel}>{label}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

function ParentQuickAction({ icon, label, onPress }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.parentQuickAction}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.primaryContainer} />
      <Text style={styles.parentQuickActionLabel}>{label}</Text>
    </Pressable>
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

function HeroTrainingCard({ training }: { training: TrainingResponse }) {
  const date = new Date(training.startsAt);
  const day = new Intl.DateTimeFormat("tr-TR", { day: "2-digit" }).format(date);
  const month = new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(date).replace(".", "");
  const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(date);
  const groups = training.groups.map((group) => group.name).join(", ");
  const inProgress = isTrainingInProgress(training);
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.coachHero, isCompact && styles.coachHeroCompact]}>
      <View style={styles.coachHeroGlow} />
      <View style={[styles.coachHeroDate, isCompact && styles.coachHeroDateCompact]}>
        <Text style={[styles.coachHeroDateText, isCompact && styles.coachHeroDateTextCompact]}>{day} {month}</Text>
        <Text style={[styles.coachHeroTime, isCompact && styles.coachHeroTimeCompact]}>{formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
      </View>
      <Text style={[styles.coachHeroWeekday, isCompact && styles.coachHeroWeekdayCompact]}>{inProgress ? "DEVAM EDEN ANTRENMAN" : weekday.toLocaleUpperCase("tr-TR")}</Text>
      <View style={[styles.coachHeroDetails, isCompact && styles.coachHeroDetailsCompact]}>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Antrenman</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {training.title}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Sporcu Grubu</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {groups || "Grup atanmamış"}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Durum</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {inProgress ? "Devam ediyor" : "Planlandı"}</Text>
        </View>
        <View style={styles.coachHeroDetailRow}>
          <Text style={[styles.coachHeroDetailLabel, isCompact && styles.coachHeroDetailLabelCompact]}>Konum</Text>
          <Text style={[styles.coachHeroDetailValue, isCompact && styles.coachHeroDetailValueCompact]}>: {training.location ?? "Belirtilmedi"}</Text>
        </View>
      </View>
      <Pressable onPress={() => router.push("/calendar")} style={[styles.coachHeroButton, isCompact && styles.coachHeroButtonCompact]}>
        <Text style={[styles.coachHeroButtonText, isCompact && styles.coachHeroButtonTextCompact]}>Programı Gör</Text>
        <MaterialCommunityIcons name="arrow-right" size={isCompact ? 21 : 24} color={colors.onPrimary} />
      </Pressable>
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
        <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: light ? colors.secondary : colors.primaryContainer }]} />
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

function averageMetrics(averages: DevelopmentMetricAverages) {
  return Math.round((averages.nutrition
    + averages.cognitiveDevelopment
    + averages.discipline
    + averages.physicalCondition
    + averages.psychologicalDevelopment
    + averages.tacticalDevelopment
    + averages.technicalDevelopment) / 7 * 10) / 10;
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
  cardHeaderAction: { alignItems: "flex-end", gap: spacing.xs },
  cardHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardInsetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  cardTitle: { ...typography.headline, color: colors.primary },
  coachEmptyCard: { gap: spacing.md },
  coachHero: {
    backgroundColor: colors.featuredCard,
    borderColor: colors.featuredCardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md
  },
  coachHeroCompact: { gap: spacing.sm, padding: 10 },
  coachHeroButton: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    marginBottom: -spacing.md,
    marginHorizontal: -spacing.md,
    marginTop: spacing.sm,
    minHeight: 50
  },
  coachHeroButtonCompact: { marginBottom: -10, marginHorizontal: -10, minHeight: 44 },
  coachHeroButtonText: { ...typography.title, color: colors.onPrimary },
  coachHeroButtonTextCompact: { fontSize: 15, lineHeight: 20 },
  coachHeroDate: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: colors.featuredCardInset,
    borderColor: colors.featuredCardBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md
  },
  coachHeroDateCompact: { gap: 2, padding: spacing.sm },
  coachHeroDateText: {
    color: colors.onFeaturedCard,
    fontFamily: "HankenGrotesk_800ExtraBold",
    fontSize: 32,
    lineHeight: 38
  },
  coachHeroDateTextCompact: { fontSize: 24, lineHeight: 29 },
  coachHeroDetailLabel: { ...typography.body, color: colors.onFeaturedCardVariant, width: 96 },
  coachHeroDetailLabelCompact: { fontSize: 12, lineHeight: 16, width: 84 },
  coachHeroDetails: { gap: spacing.sm },
  coachHeroDetailsCompact: { gap: spacing.xs },
  coachHeroDetailRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  coachHeroDetailValue: { ...typography.body, color: colors.onFeaturedCard, flex: 1 },
  coachHeroDetailValueCompact: { fontSize: 12, lineHeight: 16 },
  coachHeroGlow: {
    backgroundColor: "rgba(250,204,21,0.08)",
    borderRadius: radius.full,
    height: 180,
    position: "absolute",
    right: -90,
    top: -80,
    width: 180
  },
  coachHeroTime: { ...typography.bodyLarge, color: colors.onFeaturedCardVariant },
  coachHeroTimeCompact: { fontSize: 13, lineHeight: 18 },
  coachHeroWeekday: { ...typography.label, color: colors.onFeaturedCard, letterSpacing: 1.4 },
  coachHeroWeekdayCompact: { fontSize: 11, letterSpacing: 1.1, lineHeight: 15 },
  homeMenu: { gap: spacing.md },
  homeMenuCompact: { gap: 10 },
  homeMenuAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 80,
    padding: spacing.md
  },
  homeMenuActionCompact: { gap: 10, minHeight: 64, padding: 10 },
  homeMenuActionHighlighted: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer
  },
  homeMenuActionPressed: { transform: [{ scale: 0.985 }] },
  homeMenuIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  homeMenuIconCompact: { height: 40, width: 40 },
  homeMenuIconHighlighted: { backgroundColor: "rgba(60,47,0,0.16)" },
  homeMenuLabel: {
    ...typography.title,
    color: colors.onSurface,
    flex: 1,
    fontFamily: "HankenGrotesk_700Bold",
    letterSpacing: 0.5
  },
  homeMenuLabelCompact: { fontSize: 15, lineHeight: 20 },
  homeMenuLabelHighlighted: { color: colors.onPrimary },
  coachOutlineButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: radius.sm,
    borderWidth: 2,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  coachOutlineButtonText: { ...typography.bodyLarge, color: colors.primary },
  coachSectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  coachSectionHeaderCompact: { alignItems: "center" },
  coachSectionLink: { alignItems: "center", flexDirection: "row" },
  coachSectionLinkText: { ...typography.body, color: colors.primaryContainer },
  coachSectionTitle: { ...typography.headline, color: colors.onSurface, flex: 1 },
  coachSectionTitleCompact: { fontSize: 17, lineHeight: 22 },
  coachStat: { alignItems: "center", flex: 1, gap: spacing.xs },
  coachStatDivider: { backgroundColor: colors.outlineVariant, height: 38, width: 1 },
  coachStatLabel: { ...typography.label, color: colors.onSurfaceVariant, textAlign: "center" },
  coachStats: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.md
  },
  coachStatValue: { ...typography.display, color: colors.primaryContainer },
  coachWelcome: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  coachWelcomeCompact: { gap: 10 },
  coachWelcomeName: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  coachWelcomeNameCompact: { fontSize: 13, lineHeight: 18 },
  coachWelcomeTitle: { ...typography.headline, color: colors.onSurface },
  coachWelcomeTitleCompact: { fontSize: 17, lineHeight: 22 },
  dateSmall: { ...typography.label, color: colors.outline, marginTop: spacing.sm },
  dateText: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginBottom: 4 },
  developmentCard: { gap: spacing.sm },
  developmentScore: { ...typography.display, color: colors.primaryContainer, fontSize: 42, lineHeight: 48 },
  developmentSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  displayTitle: { ...typography.display, color: colors.primary },
  emptyAnnouncement: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, padding: spacing.lg },
  eventCard: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingLeft: spacing.xl },
  eventIconCircle: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 52, justifyContent: "center", width: 52 },
  eventDescription: { ...typography.body, color: colors.onSurfaceVariant, marginTop: 3 },
  eventKicker: { ...typography.label, color: colors.primary, textTransform: "uppercase" },
  eventTitle: { ...typography.headline, color: colors.primary },
  flexOne: { flex: 1 },
  greenText: { color: colors.secondary },
  headerBlock: { gap: spacing.sm },
  headerBlockSmallGap: { gap: spacing.sm },
  iconTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  infoTitle: { ...typography.title, color: colors.onSurface },
  kickerDark: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  linkText: { ...typography.label, color: colors.primary },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(11,28,48,0.45)", flex: 1, justifyContent: "center", padding: spacing.lg },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  modalSheet: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.lg, width: "100%" },
  modalTitle: { ...typography.headline, color: colors.primary },
  mutedBold: { ...typography.title, color: colors.outline },
  noPaddingCard: { padding: 0 },
  parentCardTitle: { ...typography.title, color: colors.primary },
  parentInfoBox: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  parentQuickAction: { alignItems: "center", backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.sm, justifyContent: "center", minHeight: 82, padding: spacing.sm },
  parentQuickActionLabel: { ...typography.label, color: colors.onSurface, textAlign: "center" },
  parentQuickActions: { flexDirection: "row", gap: spacing.sm },
  parentStatusCard: { flex: 1, gap: spacing.xs, minHeight: 102 },
  parentStatusGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  parentStatusLabel: { ...typography.label, color: colors.onSurfaceVariant },
  parentStatusPressable: { flexBasis: "47%", flexGrow: 1 },
  parentStatusValue: { ...typography.title },
  parentTitle: { ...typography.headline, color: colors.primary },
  parentTrainingCard: { gap: spacing.md },
  pickerRow: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", padding: spacing.md },
  pickerRowDisabled: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", opacity: 0.55, padding: spacing.md },
  pickerRowMain: { flex: 1, gap: 2 },
  pickerRowMeta: { ...typography.label, color: colors.onSurfaceVariant },
  pickerRowTitle: { ...typography.title, color: colors.onSurface },
  progressFill: { borderRadius: radius.full, height: "100%" },
  progressLabel: { ...typography.label, color: colors.onSurface },
  progressTrack: { backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, height: 7, overflow: "hidden" },
  progressWrap: { gap: 4 },
  redText: { color: colors.errorContainer },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.bodyLarge, color: colors.primary },
  scoreRow: { flexDirection: "row", justifyContent: "space-around" },
  sectionStack: { gap: spacing.lg },
  separator: { backgroundColor: colors.borderSoft, height: 1 },
  smallMeta: { ...typography.body, color: colors.onSurfaceVariant },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  welcomeRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }
});
