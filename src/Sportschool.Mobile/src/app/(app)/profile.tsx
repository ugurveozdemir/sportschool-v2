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
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { CircularScore, InitialsAvatar, Pill, ProfileAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

export default function ProfileScreen() {
  const { session, clearSession } = useSession();
  const isCoach = session?.loginRole === "Coach" || session?.loginRole === "SchoolAdmin";
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
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      {!isCoach ? <Text style={styles.profileTitle}>Profilim</Text> : null}
      <View style={[styles.profileHero, !isCoach && styles.memberProfileHero]}>
        <View style={styles.avatarWrap}>
          {isCoach ? <InitialsAvatar label={initials(displayName ?? "A")} size={96} tone="dark" /> : <ProfileAvatar uri={profile?.profileImageUrl ? resolveApiUrl(profile.profileImageUrl) : null} label={initials(displayName ?? "A")} size={96} tone="dark" />}
          <View style={styles.verifiedBadge}>
            <MaterialCommunityIcons name={isCoach ? "whistle-outline" : "check-decagram"} size={18} color={colors.onSecondaryContainer} />
          </View>
        </View>
        <Text style={styles.name}>{displayName ?? "Profil"}</Text>
        <Text style={styles.teamName}>{isCoach ? "Akademi Eğitmeni" : groups[0]?.name ?? "Akademi Oyuncusu"}</Text>
        <View style={styles.pillRow}>
          <Pill label={isCoach ? "Aktif Eğitmen" : "Aktif Oyuncu"} tone="success" />
          {isCoach ? <Pill label={`${groups.length} Grup`} tone="neutral" /> : null}
        </View>
      </View>

      {!isCoach ? (
        averages ? (
          <SurfaceCard style={styles.developmentCard}>
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

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Kişisel Bilgiler" />
        {!isCoach ? <Info label="Doğum tarihi" value={profile ? formatDate(profile.birthDate) : "-"} /> : null}
        {!isCoach ? <Info label="Veli" value={profile?.parentFullName ?? "-"} /> : null}
        {!isCoach ? <Info label="Veli telefonu" value={profile?.parentPhone ?? "-"} /> : null}
        <Info label="E-posta" value={session?.email ?? "-"} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Gruplar" />
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

      <Pressable disabled={logoutMutation.isPending} onPress={() => logoutMutation.mutate()} style={styles.logoutButton}>
        <MaterialCommunityIcons name="logout" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </Pressable>
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

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  avatarWrap: { position: "relative" },
  card: { gap: spacing.md },
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
  name: { ...typography.headline, color: colors.primary, textAlign: "center" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  profileHero: { alignItems: "center", gap: spacing.md },
  profileTitle: { ...typography.display, color: colors.primary },
  scoreGrid: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-around" },
  settingIcon: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.lg, height: 42, justifyContent: "center", width: 42 },
  settingRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md },
  settingsCard: { gap: spacing.md },
  settingText: { ...typography.bodyLarge, color: colors.onSurface },
  teamName: { ...typography.title, color: colors.onSurfaceVariant, textAlign: "center" },
  verifiedBadge: { alignItems: "center", backgroundColor: colors.secondaryContainer, borderColor: colors.surface, borderRadius: radius.full, borderWidth: 2, bottom: 4, height: 34, justifyContent: "center", position: "absolute", right: 4, width: 34 }
});
