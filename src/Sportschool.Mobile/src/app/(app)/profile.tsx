import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { logout } from "@/features/auth/api";
import { useCoachGroups } from "@/features/coach/api";
import { useDevelopmentSummary, useGroups, useProfile } from "@/features/me/api";
import { ParentAthleteSelector, SelectedAthleteAvatar } from "@/features/me/ParentAthleteSelector";
import type { TrainingReportResponse } from "@/features/me/types";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { CircularScore, InitialsAvatar, Pill, ProfileAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { colors } from "@/shared/design/colors";
import { useResponsiveLayout } from "@/shared/design/responsive";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function ProfileScreen() {
  const { session, clearSession } = useSession();
  const { isCompact } = useResponsiveLayout();
  const isCoach = session?.loginRole === "Coach" || session?.loginRole === "SchoolAdmin";
  const isParent = session?.loginRole === "Parent";
  const { selectedAthleteProfileId } = useAthleteSelection();
  const profileQuery = useProfile(!isCoach, selectedAthleteProfileId);
  const groupsQuery = useGroups(!isCoach, selectedAthleteProfileId);
  const developmentQuery = useDevelopmentSummary(!isCoach, selectedAthleteProfileId);
  const coachGroupsQuery = useCoachGroups(isCoach);
  const { refetch: refetchProfile } = profileQuery;

  useFocusEffect(useCallback(() => {
    if (!isCoach) {
      void refetchProfile();
    }
  }, [isCoach, refetchProfile]));
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    },
    onSettled: async () => {
      await clearSession();
      router.replace("/role");
    },
    onError: () => Alert.alert("Çıkış", "Oturum yerel olarak kapatıldı.")
  });

  if ((isCoach ? coachGroupsQuery : profileQuery).isLoading) {
    return <LoadingState label="Profil yükleniyor" />;
  }

  const profile = profileQuery.data;
  const displayName = isCoach ? session?.fullName : profile ? `${profile.firstName} ${profile.lastName}` : session?.fullName;
  const groups = isCoach ? coachGroupsQuery.data ?? [] : groupsQuery.data ?? [];
  const averages = developmentQuery.data?.averages;

  return (
    <ScreenShell
      title={getShellTitle(session)}
      navItems={getMobileNav(session)}
      avatar={isCoach ? undefined : <SelectedAthleteAvatar fallbackLabel="A" />}
    >
      {!isCoach ? <Text style={styles.profileTitle}>{isParent ? "Sporcu Profili" : "Profilim"}</Text> : null}
      {isParent ? (
        <SurfaceCard style={[styles.card, isCompact && styles.cardCompact]}>
          <SectionTitle title="Veli Hesabım" />
          <Info label="Ad soyad" value={session?.fullName ?? "-"} />
          <Info label="Telefon" value={profile?.parentPhone ?? "-"} />
          <Info label="E-posta" value={session?.email ?? "-"} />
        </SurfaceCard>
      ) : null}
      <ParentAthleteSelector />
      <View style={[styles.profileHero, isCompact && styles.profileHeroCompact, !isCoach && styles.memberProfileHero, !isCoach && isCompact && styles.memberProfileHeroCompact]}>
        <View style={styles.avatarWrap}>
          {isCoach ? <InitialsAvatar label={initials(displayName ?? "A")} size={isCompact ? 72 : 96} tone="dark" /> : <ProfileAvatar uri={profile?.profileImageUrl ? resolveApiUrl(profile.profileImageUrl) : null} label={initials(displayName ?? "A")} size={isCompact ? 72 : 96} tone="dark" />}
          <View style={[styles.verifiedBadge, isCompact && styles.verifiedBadgeCompact]}>
            <MaterialCommunityIcons name={isCoach ? "whistle-outline" : "check-decagram"} size={isCompact ? 15 : 18} color={colors.onSecondaryContainer} />
          </View>
        </View>
        <Text style={[styles.name, isCompact && styles.nameCompact]}>{displayName ?? "Profil"}</Text>
        <Text style={[styles.teamName, isCompact && styles.teamNameCompact]}>{isCoach ? "Akademi Eğitmeni" : groups[0]?.name ?? "Akademi Oyuncusu"}</Text>
        <View style={styles.pillRow}>
          <Pill label={isCoach ? "Aktif Eğitmen" : "Aktif Oyuncu"} tone="success" />
          {isCoach ? <Pill label={`${groups.length} Grup`} tone="neutral" /> : null}
        </View>
      </View>

      {!isCoach ? (
        averages ? (
          <SurfaceCard style={[styles.developmentCard, isCompact && styles.cardCompact]}>
            <View style={styles.developmentHeader}>
              <Text style={styles.developmentTitle}>Gelişim Özeti</Text>
              <Pressable onPress={() => router.push("/development")}>
                <Text style={styles.developmentLink}>Detaylar</Text>
              </Pressable>
            </View>
            <View style={styles.scoreGrid}>
              <CircularScore value={averages.technicalDevelopment} label="Teknik" />
              <CircularScore value={averages.physicalCondition} label="Kondisyon" />
              <CircularScore value={averages.discipline} label="Disiplin" color={colors.primary} />
            </View>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
          </SurfaceCard>
        )
      ) : null}

      {!isCoach ? (
        <SurfaceCard style={[styles.card, isCompact && styles.cardCompact]}>
          <SectionTitle title="Temel Bilgiler" />
          <Info label="Doğum tarihi" value={profile ? formatDate(profile.birthDate) : "-"} />
          <Info label="Yaş" value={profile ? `${formatAge(profile.birthDate)} yaş` : "-"} />
          <Info label="Baskın ayak" value={profile ? preferredFootLabel(profile.preferredFoot) : "-"} />
          <Info label="E-posta" value={profile?.email ?? "-"} />
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={[styles.card, isCompact && styles.cardCompact]}>
        <SectionTitle title="Akademi Bilgileri" />
        {!isCoach ? <Info label="Kayıt tarihi" value={profile?.createdAt ? formatDate(profile.createdAt) : "-"} /> : null}
        {groups.length === 0 ? <Text style={styles.muted}>Henüz grup ataması yok.</Text> : null}
        {groups.map((group) => (
          <View key={group.id} style={styles.groupRow}>
            <View style={styles.groupLead}>
              <MaterialCommunityIcons name={isCoach ? "shield-account-outline" : "account-group-outline"} size={22} color={colors.primary} />
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            <Pill label={isCoach && "athleteCount" in group ? `${group.athleteCount} sporcu` : "Aktif"} tone="success" />
          </View>
        ))}
      </SurfaceCard>

      {!isCoach ? (
        <SurfaceCard style={[styles.card, isCompact && styles.cardCompact]}>
          <SectionTitle title="Veli Bilgileri" />
          <Info label="Ad soyad" value={profile?.parentFullName ?? "-"} />
          <Info label="Telefon" value={profile?.parentPhone ?? "-"} />
          <Info label="E-posta" value={profile?.parentEmail ?? "-"} />
        </SurfaceCard>
      ) : null}

      {isCoach ? (
        <SurfaceCard style={[styles.card, isCompact && styles.cardCompact]}>
          <SectionTitle title="Kişisel Bilgiler" />
          <Info label="E-posta" value={session?.email ?? "-"} />
        </SurfaceCard>
      ) : null}

      {!isCoach ? <DevelopmentHistory reports={developmentQuery.data?.reports ?? []} /> : null}

      <Pressable disabled={logoutMutation.isPending} onPress={() => logoutMutation.mutate()} style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </Pressable>
    </ScreenShell>
  );
}

function DevelopmentHistory({ reports }: { reports: TrainingReportResponse[] }) {
  const recentReports = reports.slice(0, 3);

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.developmentHeader}>
        <Text style={styles.developmentTitle}>Gelişim Geçmişi</Text>
        <Pressable onPress={() => router.push("/development")}>
          <Text style={styles.developmentLink}>Tüm raporlar</Text>
        </Pressable>
      </View>
      {recentReports.length === 0 ? <Text style={styles.muted}>Henüz yayınlanmış gelişim raporu bulunmuyor.</Text> : null}
      {recentReports.map((report) => (
        <Pressable key={report.id} onPress={() => router.push({ pathname: "/reports/[trainingId]/member", params: { trainingId: report.trainingSessionId } })} style={styles.reportRow}>
          <View>
            <Text style={styles.reportDate}>{formatDate(report.trainingCompletedAt)}</Text>
            <Text style={styles.reportTitle}>{report.trainingTitle}</Text>
          </View>
          <Pill label={`%${reportAverage(report).toFixed(0)}`} tone="success" />
        </Pressable>
      ))}
    </SurfaceCard>
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

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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

function reportAverage(report: TrainingReportResponse) {
  return (report.nutritionScore
    + report.cognitiveDevelopmentScore
    + report.disciplineScore
    + report.physicalConditionScore
    + report.psychologicalDevelopmentScore
    + report.tacticalDevelopmentScore
    + report.technicalDevelopmentScore) / 7;
}

const styles = StyleSheet.create({
  avatarWrap: { position: "relative" },
  card: { gap: spacing.md },
  cardCompact: { gap: spacing.sm },
  developmentCard: { gap: spacing.md },
  developmentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  developmentLink: { ...typography.label, color: colors.primaryContainer },
  developmentTitle: { ...typography.title, color: colors.onSurface },
  groupLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  groupName: { ...typography.bodyLarge, color: colors.primary, flex: 1 },
  groupRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, justifyContent: "space-between", paddingTop: spacing.md },
  infoLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  infoRow: { gap: 2 },
  infoValue: { ...typography.bodyLarge, color: colors.primary },
  logoutButton: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  logoutText: { ...typography.title, color: colors.error },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  memberProfileHero: { backgroundColor: colors.surfaceContainerHighest, borderColor: colors.outlineVariant, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  memberProfileHeroCompact: { padding: spacing.md },
  name: { ...typography.headline, color: colors.primary, textAlign: "center" },
  nameCompact: { fontSize: 18, lineHeight: 23 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  profileHero: { alignItems: "center", gap: spacing.md },
  profileHeroCompact: { gap: spacing.sm },
  profileTitle: { ...typography.display, color: colors.primary },
  reportDate: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  reportRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md },
  reportTitle: { ...typography.bodyLarge, color: colors.onSurface },
  scoreGrid: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-around" },
  sectionHeading: { ...typography.headline, color: colors.onSurface },
  settingIcon: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg, height: 42, justifyContent: "center", width: 42 },
  settingRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md },
  settingsCard: { gap: spacing.md },
  settingText: { ...typography.bodyLarge, color: colors.onSurface },
  teamName: { ...typography.title, color: colors.onSurfaceVariant, textAlign: "center" },
  teamNameCompact: { fontSize: 15, lineHeight: 20 },
  verifiedBadge: { alignItems: "center", backgroundColor: colors.secondaryContainer, borderColor: colors.surface, borderRadius: radius.full, borderWidth: 2, bottom: 4, height: 34, justifyContent: "center", position: "absolute", right: 4, width: 34 },
  verifiedBadgeCompact: { bottom: 2, height: 28, right: 2, width: 28 }
});
