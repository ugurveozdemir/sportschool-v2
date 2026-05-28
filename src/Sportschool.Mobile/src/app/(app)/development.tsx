import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useAddAthleteToGroup, useCoachAthletes, useCreateSchoolGroup, useDeleteSchoolGroup, useGroupAthletes, useRemoveAthleteFromGroup, useSchoolGroups, useUpdateSchoolGroup } from "@/features/coach/api";
import type { SchoolGroupResponse } from "@/features/coach/types";
import { useReports } from "@/features/me/api";
import type { AthleteReportResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

const scoreLabels = [
  ["Hız", "speedScore", "run-fast"],
  ["Güç", "strengthScore", "arm-flex-outline"],
  ["Dribling", "dribblingScore", "soccer"],
  ["Şut", "shootingScore", "target"]
] as const;

type GroupFormState = {
  name: string;
  description: string;
};

const emptyGroupForm: GroupFormState = {
  name: "",
  description: ""
};

export default function DevelopmentScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const reportsQuery = useReports(!isCoach);
  const schoolGroupsQuery = useSchoolGroups(isCoach);

  if (isCoach && schoolGroupsQuery.isLoading) {
    return <LoadingState label="Gruplar yükleniyor" />;
  }

  if (!isCoach && reportsQuery.isLoading) {
    return <LoadingState label="Raporlar yükleniyor" />;
  }

  if (isCoach) {
    return <CoachTeams session={session} groups={schoolGroupsQuery.data ?? []} />;
  }

  return <DevelopmentReports session={session} reports={reportsQuery.data ?? []} />;
}

function CoachTeams({ session, groups }: { session: ReturnType<typeof useSession>["session"]; groups: SchoolGroupResponse[] }) {
  const createGroup = useCreateSchoolGroup();
  const deleteGroup = useDeleteSchoolGroup();
  const [editingGroup, setEditingGroup] = useState<SchoolGroupResponse | null>(null);
  const [form, setForm] = useState(emptyGroupForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [athletesGroup, setAthletesGroup] = useState<SchoolGroupResponse | null>(null);
  const updateGroup = useUpdateSchoolGroup(editingGroup?.id);
  const isSaving = createGroup.isPending || updateGroup.isPending;

  function openCreateForm() {
    setEditingGroup(null);
    setForm(emptyGroupForm);
    setIsFormVisible(true);
  }

  function openEditForm(group: SchoolGroupResponse) {
    setEditingGroup(group);
    setForm({ name: group.name, description: group.description ?? "" });
    setIsFormVisible(true);
  }

  function submitGroup() {
    const request = {
      name: form.name.trim(),
      description: form.description.trim() || null
    };

    if (!request.name) {
      Alert.alert("Gruplar", "Grup adı boş bırakılamaz.");
      return;
    }

    const mutation = editingGroup ? updateGroup : createGroup;
    mutation.mutate(request, {
      onSuccess: () => {
        setIsFormVisible(false);
        Alert.alert("Gruplar", editingGroup ? "Grup güncellendi." : "Grup eklendi.");
      },
      onError: () => Alert.alert("Gruplar", editingGroup ? "Grup güncellenemedi." : "Grup eklenemedi.")
    });
  }

  function confirmDelete(group: SchoolGroupResponse) {
    Alert.alert("Grubu sil", `${group.name} grubunu silmek istiyor musun?`, [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          deleteGroup.mutate(group.id, {
            onSuccess: () => Alert.alert("Gruplar", "Grup silindi."),
            onError: () => Alert.alert("Gruplar", "Grup silinemedi.")
          });
        }
      }
    ]);
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerBlock}>
        <View>
          <Text style={styles.title}>Gruplar</Text>
          <Text style={styles.subtitle}>Kulüpteki aktif grupları yönet.</Text>
        </View>
        <Pressable onPress={openCreateForm} style={styles.primaryButton}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Yeni Grup Ekle</Text>
        </Pressable>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile icon="shield-account-outline" label="Grup" value={`${groups.length}`} />
        <MetricTile icon="check-circle-outline" label="Aktif" value={`${groups.filter((group) => group.isActive).length}`} tone="success" />
      </View>

      <View style={styles.list}>
        {groups.length === 0 ? (
          <SurfaceCard>
            <EmptyState title="Grup yok" description="Henüz aktif grup bulunmuyor." />
          </SurfaceCard>
        ) : (
          groups.map((group) => <TeamRow key={group.id} deleting={deleteGroup.isPending} group={group} onDelete={confirmDelete} onEdit={openEditForm} onManageAthletes={setAthletesGroup} />)
        )}
      </View>
      <GroupFormModal
        editing={Boolean(editingGroup)}
        form={form}
        saving={isSaving}
        visible={isFormVisible}
        onChangeForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setIsFormVisible(false)}
        onSubmit={submitGroup}
      />
      <GroupAthletesModal
        group={athletesGroup}
        onClose={() => setAthletesGroup(null)}
      />
    </ScreenShell>
  );
}

function DevelopmentReports({ session, reports }: { session: ReturnType<typeof useSession>["session"]; reports: AthleteReportResponse[] }) {
  const latest = reports[0];
  const chartValues = reports.length > 0
    ? reports.slice(0, 6).reverse().map((report) => averageScore(report) * 10)
    : [40, 55, 45, 70, 60, 85];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "S"} size={42} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Gelişim</Text>
        <Text style={styles.subtitle}>Performans metrikleri, grafik ve antrenör yorumları.</Text>
      </View>

      {latest ? (
        <>
          <View style={styles.metricsGrid}>
            {scoreLabels.map(([label, key, icon]) => (
              <MetricTile key={key} icon={icon} label={label} value={latest[key].toFixed(1)} tone={key === "speedScore" ? "success" : "primary"} />
            ))}
          </View>

          <SurfaceCard style={styles.chartCard}>
            <SectionTitle title="Gelişim Grafiği" action="Son 6 Rapor" />
            <BarChart values={chartValues} />
            <View style={styles.legendRow}>
              <LegendDot label="Teknik" color={colors.primary} />
              <LegendDot label="Hız" color={colors.secondary} />
              <LegendDot label="Dayanıklılık" color={colors.surfaceContainerHigh} />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionHeading}>Antrenör Yorumları</Text>
              <MaterialCommunityIcons name="forum-outline" size={22} color={colors.outline} />
            </View>
            {reports.map((report) => (
              <View key={report.id} style={styles.commentItem}>
                <Text style={styles.date}>{formatDate(report.createdAt)}</Text>
                <Text style={styles.summary}>{report.summary}</Text>
                <Text style={styles.improvement}>Gelişim alanı: {report.improvementAreas}</Text>
              </View>
            ))}
          </SurfaceCard>

          <Pressable style={styles.contactButton}>
            <MaterialCommunityIcons name="chat-outline" size={20} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Antrenör ile İletişime Geç</Text>
          </Pressable>
        </>
      ) : (
        <SurfaceCard>
          <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
        </SurfaceCard>
      )}
    </ScreenShell>
  );
}

function TeamRow({ deleting, group, onDelete, onEdit, onManageAthletes }: { deleting: boolean; group: SchoolGroupResponse; onDelete: (group: SchoolGroupResponse) => void; onEdit: (group: SchoolGroupResponse) => void; onManageAthletes: (group: SchoolGroupResponse) => void }) {
  return (
    <SurfaceCard style={styles.teamCard}>
      <View style={styles.teamLead}>
        <InitialsAvatar label={groupCode(group.name)} size={54} tone="dark" />
        <View style={styles.flexOne}>
          <Text style={styles.teamTitle}>{group.name}</Text>
          <View style={styles.coachLine}>
            <MaterialCommunityIcons name="account-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.rowMeta}>{group.description ?? "Antrenör açıklaması eklenmemiş"}</Text>
          </View>
        </View>
      </View>
      <View style={styles.teamFooter}>
        <Pill label={group.isActive ? "Aktif" : "Pasif"} tone="neutral" icon="account-group-outline" />
        <View style={styles.actionRow}>
          <Pressable accessibilityLabel="Sporcuları yönet" onPress={() => onManageAthletes(group)} style={styles.iconAction}>
            <MaterialCommunityIcons name="account-multiple-outline" size={22} color={colors.secondary} />
          </Pressable>
          <Pressable accessibilityLabel="Grubu düzenle" onPress={() => onEdit(group)} style={styles.iconAction}>
            <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityLabel="Grubu sil" disabled={deleting} onPress={() => onDelete(group)} style={styles.iconAction}>
            <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </SurfaceCard>
  );
}

function GroupFormModal({ editing, form, saving, visible, onChangeForm, onClose, onSubmit }: {
  editing: boolean;
  form: GroupFormState;
  saving: boolean;
  visible: boolean;
  onChangeForm: (patch: Partial<GroupFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? "Grubu Düzenle" : "Yeni Grup"}</Text>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.iconAction}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TextField label="Grup Adı" value={form.name} onChangeText={(value) => onChangeForm({ name: value })} placeholder="U12 A Takımı" />
            <TextField label="Açıklama" multiline value={form.description} onChangeText={(value) => onChangeForm({ description: value })} placeholder="Opsiyonel açıklama" />
            <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={onSubmit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function GroupAthletesModal({ group, onClose }: { group: SchoolGroupResponse | null; onClose: () => void }) {
  const groupAthletesQuery = useGroupAthletes(group?.id);
  const allAthletesQuery = useCoachAthletes(Boolean(group));
  const addAthlete = useAddAthleteToGroup(group?.id);
  const removeAthlete = useRemoveAthleteFromGroup(group?.id);
  const [showAddView, setShowAddView] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const currentAthletes = groupAthletesQuery.data ?? [];
  const currentAthleteIds = new Set(currentAthletes.map((a) => a.id));
  const availableAthletes = (allAthletesQuery.data ?? []).filter((a) => !currentAthleteIds.has(a.athleteProfileId));
  const isAdding = addAthlete.isPending;

  function handleClose() {
    setShowAddView(false);
    setSelectedIds(new Set());
    onClose();
  }

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

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={Boolean(group)}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.athletesModalCard]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{showAddView ? "Sporcu Ekle" : group?.name ?? "Sporcular"}</Text>
            <Pressable accessibilityLabel="Kapat" onPress={showAddView ? () => { setShowAddView(false); setSelectedIds(new Set()); } : handleClose} style={styles.iconAction}>
              <MaterialCommunityIcons name={showAddView ? "arrow-left" : "close"} size={22} color={colors.primary} />
            </Pressable>
          </View>

          {showAddView ? (
            <>
              <ScrollView contentContainerStyle={styles.athletesList} showsVerticalScrollIndicator={false}>
                {allAthletesQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
                ) : availableAthletes.length === 0 ? (
                  <EmptyState title="Sporcu yok" description="Eklenebilecek sporcu bulunmuyor." />
                ) : (
                  availableAthletes.map((athlete) => {
                    const isSelected = selectedIds.has(athlete.athleteProfileId);
                    return (
                      <Pressable key={athlete.athleteProfileId} onPress={() => toggleSelection(athlete.athleteProfileId)} style={styles.athleteRow}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                          {isSelected && <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />}
                        </View>
                        <InitialsAvatar label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={40} tone="dark" />
                        <View style={styles.flexOne}>
                          <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                          <Text style={styles.rowMeta}>{athlete.groups.length > 0 ? athlete.groups.join(", ") : "Grup ataması yok"}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
              {selectedIds.size > 0 && (
                <View style={styles.batchActionBar}>
                  <Button
                    disabled={isAdding}
                    label={isAdding ? "Ekleniyor..." : `${selectedIds.size} Sporcu Ekle`}
                    onPress={addSelected}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.athletesList} showsVerticalScrollIndicator={false}>
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
                        <Text style={styles.rowMeta}>{athlete.parentFullName}</Text>
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
              </ScrollView>
              <View style={styles.batchActionBar}>
                <Button label="Sporcu Ekle" onPress={() => setShowAddView(true)} />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.rowMeta}>{label}</Text>
    </View>
  );
}

function averageScore(report: AthleteReportResponse) {
  return (report.speedScore + report.strengthScore + report.dribblingScore + report.shootingScore) / 4;
}

function groupCode(name: string) {
  const match = name.match(/U\d+/i)?.[0];
  return (match ?? name.split(" ").map((part) => part[0]).join("")).slice(0, 3).toUpperCase();
}

const styles = StyleSheet.create({
  actionRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  athleteRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  athleteName: { ...typography.title, color: colors.onSurface, fontSize: 15 },
  athletesList: { gap: spacing.xs, paddingBottom: spacing.lg },
  athletesModalCard: { maxHeight: "85%" },
  batchActionBar: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, paddingTop: spacing.md },
  chartCard: { gap: spacing.md },
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.sm, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  coachLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  commentCard: { gap: spacing.md },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  commentItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  contactButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  date: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.md },
  iconAction: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  improvement: { ...typography.body, color: colors.onSurfaceVariant },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  list: { gap: spacing.md },
  loader: { paddingVertical: spacing.xl },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "80%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  primaryButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  primaryButtonText: { ...typography.label, color: colors.onPrimary },
  removeButton: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  sectionHeading: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summary: { ...typography.bodyLarge, color: colors.onSurface },
  teamCard: { gap: spacing.md },
  teamFooter: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md },
  teamLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  teamTitle: { ...typography.title, color: colors.onSurface },
  title: { ...typography.headline, color: colors.primary }
});
