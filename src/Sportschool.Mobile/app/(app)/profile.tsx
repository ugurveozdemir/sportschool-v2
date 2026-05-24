import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/app/sessionProvider";
import { logout } from "@/features/auth/api";
import { useGroups, useProfile } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Card } from "@/shared/components/Card";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate } from "@/shared/utils/date";

export default function ProfileScreen() {
  const { session, clearSession } = useSession();
  const profileQuery = useProfile();
  const groupsQuery = useGroups();
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (session?.refreshToken) {
        await logout(session.refreshToken);
      }
    },
    onSettled: async () => {
      await clearSession();
      router.replace("/(auth)/role");
    },
    onError: () => Alert.alert("Çıkış", "Oturum yerel olarak kapatıldı.")
  });

  if (profileQuery.isLoading) {
    return <LoadingState label="Profil yükleniyor" />;
  }

  const profile = profileQuery.data;

  return (
    <AppScreen>
      <View style={styles.profileHero}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="account" size={54} color={colors.onPrimary} />
        </View>
        <Text style={styles.name}>{profile ? `${profile.firstName} ${profile.lastName}` : session?.fullName}</Text>
        <Badge label="Aktif Oyuncu" tone="success" />
      </View>

      <Card style={styles.card}>
        <Info label="Doğum tarihi" value={profile ? formatDate(profile.birthDate) : "-"} />
        <Info label="Veli" value={profile?.parentFullName ?? "-"} />
        <Info label="Veli telefonu" value={profile?.parentPhone ?? "-"} />
        <Info label="E-posta" value={session?.email ?? "-"} />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Gruplar</Text>
        {(groupsQuery.data ?? []).map((group) => (
          <View key={group.id} style={styles.groupRow}>
            <Text style={styles.groupName}>{group.name}</Text>
            <Badge label="Aktif" tone="success" />
          </View>
        ))}
        {groupsQuery.data?.length === 0 ? <Text style={styles.muted}>Henüz grup ataması yok.</Text> : null}
      </Card>

      <Button disabled={logoutMutation.isPending} label="Çıkış Yap" onPress={() => logoutMutation.mutate()} variant="outline" />
    </AppScreen>
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

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, height: 108, justifyContent: "center", width: 108 },
  card: { gap: spacing.md, marginBottom: spacing.lg },
  groupName: { ...typography.bodyLarge, color: colors.primary },
  groupRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  infoRow: { gap: 2 },
  infoValue: { ...typography.bodyLarge, color: colors.primary },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  name: { ...typography.display, color: colors.primary, textAlign: "center" },
  profileHero: { alignItems: "center", gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.md },
  sectionTitle: { ...typography.title, color: colors.primary }
});
