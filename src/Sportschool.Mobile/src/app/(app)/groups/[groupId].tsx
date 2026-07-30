import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import {
  useAddAthleteToGroup,
  useDeleteSchoolGroup,
  useGroupAthletes,
  useRemoveAthleteFromGroup,
  useSchoolGroups,
  useSchoolAthletes,
  useUpdateSchoolGroup
} from "@/features/coach/api";
import type { SchoolGroupResponse } from "@/features/coach/types";
import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { ProfileAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";

export default function GroupDetailScreen() {
  const { session } = useSession();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const schoolGroupsQuery = useSchoolGroups(true);
  const group = (schoolGroupsQuery.data ?? []).find((g) => g.id === groupId);

  if (schoolGroupsQuery.isLoading) {
    return <LoadingState label="Grup yükleniyor" />;
  }

  if (!group) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.card}>
          <Text style={styles.headingText}>Grup bulunamadı</Text>
          <Text style={styles.mutedText}>Bu grup silinmiş veya artık aktif değil.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return <GroupDetail session={session} group={group} />;
}

function GroupDetail({ session, group }: { session: ReturnType<typeof useSession>["session"]; group: SchoolGroupResponse }) {
  const groupAthletesQuery = useGroupAthletes(group.id);
  const allAthletesQuery = useSchoolAthletes(true);
  const addAthlete = useAddAthleteToGroup(group.id);
  const removeAthlete = useRemoveAthleteFromGroup(group.id);
  const updateGroup = useUpdateSchoolGroup(group.id);
  const deleteGroup = useDeleteSchoolGroup();

  const [showAddView, setShowAddView] = useState(false);
  const [showParents, setShowParents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description ?? "");

  const currentAthletes = groupAthletesQuery.data ?? [];
  const currentAthleteIds = new Set(currentAthletes.map((a) => a.id));
  const availableAthletes = (allAthletesQuery.data ?? []).filter((a) => !currentAthleteIds.has(a.id));

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function addSelected() {
    for (const id of selectedIds) {
      try {
        await addAthlete.mutateAsync(id);
      } catch {
        // skip duplicates / failures silently
      }
    }
    setSelectedIds(new Set());
    setShowAddView(false);
  }

  function confirmRemove(athleteId: string, name: string) {
    Alert.alert("Sporcu Çıkar", `${name} sporcusunu bu gruptan çıkarmak istiyor musun?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkar",
        style: "destructive",
        onPress: () => removeAthlete.mutate(athleteId)
      }
    ]);
  }

  function saveEdit() {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      Alert.alert("Gruplar", "Grup adı boş bırakılamaz.");
      return;
    }
    updateGroup.mutate(
      { name: trimmedName, description: editDescription.trim() || null },
      {
        onSuccess: () => {
          setIsEditing(false);
          Alert.alert("Gruplar", "Grup güncellendi.");
        },
        onError: () => Alert.alert("Gruplar", "Grup güncellenemedi.")
      }
    );
  }

  function confirmDelete() {
    Alert.alert("Grubu Sil", `${group.name} grubunu silmek istiyor musun?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          deleteGroup.mutate(group.id, {
            onSuccess: () => {
              Alert.alert("Gruplar", "Grup silindi.");
              router.back();
            },
            onError: () => Alert.alert("Gruplar", "Grup silinemedi.")
          });
        }
      }
    ]);
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headingText}>Sporcular</Text>
          <Text numberOfLines={1} style={styles.headerGroupName}>{group.name}</Text>
        </View>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{currentAthletes.length}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => {
            setIsEditing(true);
            setEditName(group.name);
            setEditDescription(group.description ?? "");
          }}
          style={styles.actionChip}
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles.actionChipText}>Grubu Düzenle</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={[styles.actionChip, styles.actionChipDanger]}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          <Text style={[styles.actionChipText, styles.actionChipDangerText]}>Grubu Sil</Text>
        </Pressable>
      </View>

      {isEditing && (
        <SurfaceCard style={styles.card}>
          <SectionTitle title="Grubu Düzenle" />
          <TextField label="Grup Adı" value={editName} onChangeText={setEditName} placeholder="U12 A Takımı" />
          <TextField label="Açıklama" multiline value={editDescription} onChangeText={setEditDescription} placeholder="Opsiyonel açıklama" />
          <View style={styles.editActions}>
            <Button label="Vazgeç" variant="outline" onPress={() => setIsEditing(false)} />
            <Button disabled={updateGroup.isPending} label={updateGroup.isPending ? "Kaydediliyor" : "Kaydet"} onPress={saveEdit} />
          </View>
        </SurfaceCard>
      )}

      {showAddView ? (
        <SurfaceCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <SectionTitle title="Sporcu Ekle" />
            <Pressable onPress={() => { setShowAddView(false); setSelectedIds(new Set()); }} style={styles.backChip}>
              <MaterialCommunityIcons name="arrow-left" size={18} color={colors.primary} />
              <Text style={styles.actionChipText}>Geri</Text>
            </Pressable>
          </View>
          {allAthletesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
          ) : availableAthletes.length === 0 ? (
            <EmptyState title="Sporcu yok" description="Eklenebilecek sporcu bulunmuyor." />
          ) : (
            <>
              {availableAthletes.map((athlete) => {
                const isSelected = selectedIds.has(athlete.id);
                return (
                  <Pressable key={athlete.id} onPress={() => toggleSelection(athlete.id)} style={styles.athleteRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />}
                    </View>
                    {athlete.profileImageUrl ? (
                      <ProfileAvatar uri={resolveApiUrl(athlete.profileImageUrl)} label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={40} tone="dark" />
                    ) : (
                      <AcademyLogoAvatar size={40} />
                    )}
                    <View style={styles.flexOne}>
                      <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                      <Text style={styles.athleteMeta}>Veli: {athlete.parentFullName}</Text>
                    </View>
                  </Pressable>
                );
              })}
              {selectedIds.size > 0 && (
                <Button
                  disabled={addAthlete.isPending}
                  label={addAthlete.isPending ? "Ekleniyor..." : `${selectedIds.size} Sporcu Ekle`}
                  onPress={addSelected}
                />
              )}
            </>
          )}
        </SurfaceCard>
      ) : (
        <View style={styles.rosterSection}>
          <View style={styles.sectionHeader}>
            <Pressable onPress={() => setShowParents((current) => !current)} style={styles.parentToggle}>
              <View style={[styles.toggleTrack, showParents && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, showParents && styles.toggleThumbActive]} />
              </View>
              <Text style={styles.parentToggleText}>Velileri Göster</Text>
            </Pressable>
            <Pressable onPress={() => setShowAddView(true)} style={styles.addChip}>
              <MaterialCommunityIcons name="plus" size={16} color={colors.onPrimary} />
              <Text style={styles.addChipText}>Sporcu Ekle</Text>
            </Pressable>
          </View>
          {groupAthletesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
          ) : currentAthletes.length === 0 ? (
            <SurfaceCard>
              <EmptyState title="Sporcu yok" description="Bu grupta henüz sporcu bulunmuyor." />
            </SurfaceCard>
          ) : (
            <View style={styles.athleteList}>
              {currentAthletes.map((athlete, index) => (
                <Pressable
                  key={athlete.id}
                  onPress={() => router.push(`/athletes/${athlete.id}`)}
                  style={({ pressed }) => [styles.athleteCard, pressed && styles.athleteCardPressed]}
                >
                  {athlete.profileImageUrl ? (
                    <ProfileAvatar
                      uri={resolveApiUrl(athlete.profileImageUrl)}
                      label={`${athlete.firstName[0]}${athlete.lastName[0]}`}
                      size={52}
                      tone="dark"
                    />
                  ) : (
                    <AcademyLogoAvatar size={52} />
                  )}
                  <Text style={styles.athleteIndex}>{index + 1}</Text>
                  <View style={styles.flexOne}>
                    <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                    {showParents ? (
                      <View style={styles.parentInfo}>
                        <MaterialCommunityIcons name="account-heart-outline" size={17} color={colors.onSurfaceVariant} />
                        <Text style={styles.athleteMeta}>{athlete.parentFullName}</Text>
                      </View>
                    ) : (
                      <Text style={styles.athleteMeta}>Profili görüntüle</Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityLabel={`${athlete.firstName} sporcusunu gruptan çıkar`}
                    disabled={removeAthlete.isPending}
                    hitSlop={8}
                    onPress={() => confirmRemove(athlete.id, `${athlete.firstName} ${athlete.lastName}`)}
                    style={styles.removeButton}
                  >
                    <MaterialCommunityIcons name="account-minus-outline" size={21} color={colors.error} />
                  </Pressable>
                  <MaterialCommunityIcons name="chevron-right" size={27} color={colors.onSurfaceVariant} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionChip: { alignItems: "center", backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, borderRadius: radius.sm, borderWidth: 1, flex: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  actionChipDanger: { backgroundColor: "rgba(147,0,10,0.22)", borderColor: colors.errorContainer },
  actionChipDangerText: { color: colors.error },
  actionChipText: { ...typography.label, color: colors.primary },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  addChip: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addChipText: { ...typography.label, color: colors.onPrimary },
  athleteCard: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 104, padding: spacing.md },
  athleteCardPressed: { borderColor: colors.primaryContainer, transform: [{ scale: 0.99 }] },
  athleteIndex: { ...typography.title, color: colors.surfaceVariant, minWidth: 20, textAlign: "center" },
  athleteList: { gap: spacing.md },
  athleteMeta: { ...typography.body, color: colors.onSurfaceVariant },
  athleteName: { ...typography.title, color: colors.onSurface },
  athleteRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  backChip: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  card: { gap: spacing.md },
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.sm, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  detailHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  editActions: { flexDirection: "row", gap: spacing.sm },
  flexOne: { flex: 1 },
  headerCopy: { alignItems: "center", flex: 1 },
  headerCount: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.full, height: 40, justifyContent: "center", width: 40 },
  headerCountText: { ...typography.label, color: colors.primaryContainer },
  headerGroupName: { ...typography.body, color: colors.onSurfaceVariant, maxWidth: 230 },
  headingText: { ...typography.headline, color: colors.primary, textAlign: "center" },
  identity: { alignItems: "center", gap: spacing.sm },
  loader: { paddingVertical: spacing.xl },
  mutedText: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  parentInfo: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  parentToggle: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  parentToggleText: { ...typography.bodyLarge, color: colors.onSurface },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  removeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  rosterSection: { gap: spacing.lg },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  toggleThumb: { backgroundColor: colors.onSurfaceVariant, borderRadius: radius.full, height: 18, transform: [{ translateX: 0 }], width: 18 },
  toggleThumbActive: { backgroundColor: colors.onPrimary, transform: [{ translateX: 16 }] },
  toggleTrack: { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, justifyContent: "center", padding: 3, width: 42 },
  toggleTrackActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer }
});
