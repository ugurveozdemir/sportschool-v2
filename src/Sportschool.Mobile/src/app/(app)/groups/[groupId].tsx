import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import {
  useAddAthleteToGroup,
  useCoachAthletes,
  useDeleteSchoolGroup,
  useGroupAthletes,
  useRemoveAthleteFromGroup,
  useSchoolGroups,
  useUpdateSchoolGroup
} from "@/features/coach/api";
import type { SchoolGroupResponse } from "@/features/coach/types";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
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
  const allAthletesQuery = useCoachAthletes(true);
  const addAthlete = useAddAthleteToGroup(group.id);
  const removeAthlete = useRemoveAthleteFromGroup(group.id);
  const updateGroup = useUpdateSchoolGroup(group.id);
  const deleteGroup = useDeleteSchoolGroup();

  const [showAddView, setShowAddView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDescription, setEditDescription] = useState(group.description ?? "");

  const currentAthletes = groupAthletesQuery.data ?? [];
  const currentAthleteIds = new Set(currentAthletes.map((a) => a.id));
  const availableAthletes = (allAthletesQuery.data ?? []).filter((a) => !currentAthleteIds.has(a.athleteProfileId));

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

  const code = groupCode(group.name);

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.identity}>
          <InitialsAvatar label={code} size={108} tone="dark" />
          <Text style={styles.headingText}>{group.name}</Text>
          <Text style={styles.mutedText}>{group.description ?? "Açıklama eklenmemiş"}</Text>
          <View style={styles.pillRow}>
            <Pill label={group.isActive ? "Aktif" : "Pasif"} tone="neutral" icon="account-group-outline" />
            <Pill label={`${currentAthletes.length} Sporcu`} tone="success" icon="account-multiple-outline" />
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <Pressable onPress={() => { setIsEditing(true); setEditName(group.name); setEditDescription(group.description ?? ""); }} style={styles.actionChip}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={styles.actionChipText}>Düzenle</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={[styles.actionChip, styles.actionChipDanger]}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          <Text style={[styles.actionChipText, styles.actionChipDangerText]}>Sil</Text>
        </Pressable>
      </View>

      {/* Edit Section */}
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

      {/* Athletes Section */}
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
                const isSelected = selectedIds.has(athlete.athleteProfileId);
                return (
                  <Pressable key={athlete.athleteProfileId} onPress={() => toggleSelection(athlete.athleteProfileId)} style={styles.athleteRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />}
                    </View>
                    <InitialsAvatar label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={40} tone="dark" />
                    <View style={styles.flexOne}>
                      <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                      <Text style={styles.athleteMeta}>{athlete.groups.length > 0 ? athlete.groups.join(", ") : "Grup ataması yok"}</Text>
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
        <SurfaceCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <SectionTitle title="Sporcular" />
            <Pressable onPress={() => setShowAddView(true)} style={styles.addChip}>
              <MaterialCommunityIcons name="plus" size={16} color={colors.onPrimary} />
              <Text style={styles.addChipText}>Ekle</Text>
            </Pressable>
          </View>
          {groupAthletesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
          ) : currentAthletes.length === 0 ? (
            <EmptyState title="Sporcu yok" description="Bu grupta henüz sporcu bulunmuyor." />
          ) : (
            currentAthletes.map((athlete) => (
              <View key={athlete.id} style={styles.athleteRow}>
                <InitialsAvatar label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={40} tone="dark" />
                <View style={styles.flexOne}>
                  <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                  <Text style={styles.athleteMeta}>{athlete.parentFullName}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`${athlete.firstName} sporcusunu çıkar`}
                  disabled={removeAthlete.isPending}
                  onPress={() => confirmRemove(athlete.id, `${athlete.firstName} ${athlete.lastName}`)}
                  style={styles.removeButton}
                >
                  <MaterialCommunityIcons name="account-minus-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            ))
          )}
        </SurfaceCard>
      )}
    </ScreenShell>
  );
}

function groupCode(name: string) {
  const match = name.match(/U\d+/i)?.[0];
  return (match ?? name.split(" ").map((part) => part[0]).join("")).slice(0, 3).toUpperCase();
}

const styles = StyleSheet.create({
  actionChip: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.lg, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  actionChipDanger: { backgroundColor: colors.errorContainer },
  actionChipDangerText: { color: colors.error },
  actionChipText: { ...typography.label, color: colors.primary },
  actionsRow: { flexDirection: "row", gap: spacing.sm },
  addChip: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  addChipText: { ...typography.label, color: colors.onPrimary },
  athleteMeta: { ...typography.body, color: colors.onSurfaceVariant },
  athleteName: { ...typography.title, color: colors.onSurface, fontSize: 15 },
  athleteRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  backChip: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  card: { gap: spacing.md },
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.sm, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  detailHeader: { gap: spacing.md },
  editActions: { flexDirection: "row", gap: spacing.sm },
  flexOne: { flex: 1 },
  headingText: { ...typography.headline, color: colors.primary, textAlign: "center" },
  identity: { alignItems: "center", gap: spacing.sm },
  loader: { paddingVertical: spacing.xl },
  mutedText: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  removeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }
});
