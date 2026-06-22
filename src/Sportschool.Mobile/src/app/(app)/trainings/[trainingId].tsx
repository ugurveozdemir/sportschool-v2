import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { useSession } from "@/core/sessionProvider";
import { useCoachAttendanceRoster, useSaveCoachAttendanceBatch, useSchoolGroups, useUpdateCoachTraining } from "@/features/coach/api";
import type { SaveCoachAttendanceItem } from "@/features/coach/api";
import type { CoachAttendanceRosterItem, CoachAttendanceRosterTraining, SchoolGroupResponse, UpdateCoachTrainingRequest } from "@/features/coach/types";
import type { AttendanceStatus } from "@/shared/constants/domain";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatTime } from "@/shared/utils/date";

export default function TrainingDetailScreen() {
  const { session } = useSession();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const rosterQuery = useCoachAttendanceRoster(isCoach ? trainingId : undefined);
  const groupsQuery = useSchoolGroups(isCoach);
  const updateTraining = useUpdateCoachTraining(isCoach ? trainingId : undefined);
  const saveAttendance = useSaveCoachAttendanceBatch(isCoach ? trainingId : undefined);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});

  const rosterAthletes = rosterQuery.data?.athletes;
  useEffect(() => {
    if (!rosterAthletes) {
      return;
    }
    setStatuses(Object.fromEntries(rosterAthletes.map((athlete) => [athlete.athleteProfileId, athlete.status ?? "Present"])));
  }, [rosterAthletes]);

  const submitAttendance = () => {
    const athletes = rosterQuery.data?.athletes ?? [];
    const items = athletes.reduce<SaveCoachAttendanceItem[]>((pending, athlete) => {
      const target = statuses[athlete.athleteProfileId] ?? "Present";
      if (athlete.status === null) {
        pending.push({ athleteProfileId: athlete.athleteProfileId, status: target, existing: false });
      } else if (athlete.status !== target) {
        pending.push({ athleteProfileId: athlete.athleteProfileId, status: target, existing: true });
      }
      return pending;
    }, []);

    if (items.length === 0) {
      Alert.alert("Yoklama", "Kaydedilecek bir değişiklik yok.");
      return;
    }

    saveAttendance.mutate(items, {
      onSuccess: () => Alert.alert("Yoklama", "Yoklama kaydedildi."),
      onError: () => Alert.alert("Yoklama", "Yoklama kaydedilemedi. Lütfen tekrar deneyin.")
    });
  };

  if (!isCoach) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.card}>
          <Text style={styles.headingText}>Antrenman bulunamadı</Text>
          <Text style={styles.mutedText}>Bu detay ekranı şu an sadece koç hesapları için açık.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (rosterQuery.isLoading) {
    return <LoadingState label="Antrenman yükleniyor" />;
  }

  if (!rosterQuery.data) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.card}>
          <Text style={styles.headingText}>Antrenman bulunamadı</Text>
          <Text style={styles.mutedText}>Bu antrenman silinmiş olabilir veya erişim yetkin olmayabilir.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const { training, athletes } = rosterQuery.data;
  const notes = training.notes?.trim();

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Antrenman Detayı</Text>
          <Text style={styles.headingText}>{training.title}</Text>
          <Text style={styles.mutedText}>{formatTrainingDate(training.startsAt)} · {formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
        </View>
        <Pressable accessibilityLabel="Antrenmanı düzenle" onPress={() => setIsEditVisible(true)} style={styles.editButton}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <MaterialCommunityIcons name="soccer-field" size={28} color={colors.secondary} />
          </View>
          <View style={styles.flexOne}>
            <Text style={styles.sectionLabel}>Konum</Text>
            <Text style={styles.primaryText}>{training.location ?? "Konum girilmedi"}</Text>
          </View>
        </View>
        <View style={styles.pillRow}>
          <Pill label={`${training.groups.length} grup`} tone="primary" icon="account-group-outline" />
          <Pill label={`${athletes.length} sporcu`} tone="success" icon="account-multiple-outline" />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Açıklama" />
        <Text style={notes ? styles.bodyText : styles.mutedText}>{notes || "Bu antrenman için açıklama eklenmemiş."}</Text>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Katılan Gruplar" />
        <View style={styles.groupList}>
          {training.groups.map((group) => (
            <View key={group.id} style={styles.groupRow}>
              <MaterialCommunityIcons name="account-group-outline" size={20} color={colors.primary} />
              <Text style={styles.primaryText}>{group.name}</Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Yoklama" />
        {athletes.length === 0 ? (
          <EmptyState title="Oyuncu yok" description="Bu antrenmana bağlı gruplarda aktif oyuncu bulunmuyor." />
        ) : (
          <>
            <Text style={styles.mutedText}>{"Herkes varsayılan \"Geldi\" işaretli. Sadece istisnaları değiştir ve kaydet."}</Text>
            <View style={styles.athleteList}>
              {athletes.map((athlete) => (
                <AttendanceRow
                  key={athlete.athleteProfileId}
                  athlete={athlete}
                  status={statuses[athlete.athleteProfileId] ?? "Present"}
                  onChange={(status) => setStatuses((current) => ({ ...current, [athlete.athleteProfileId]: status }))}
                />
              ))}
            </View>
            <Button
              disabled={saveAttendance.isPending}
              label={saveAttendance.isPending ? "Kaydediliyor" : "Yoklamayı Kaydet"}
              onPress={submitAttendance}
            />
          </>
        )}
      </SurfaceCard>

      <EditTrainingModal
        groups={groupsQuery.data ?? []}
        saving={updateTraining.isPending}
        training={training}
        visible={isEditVisible}
        onClose={() => setIsEditVisible(false)}
        onSubmit={(request) => {
          updateTraining.mutate(request, {
            onSuccess: () => {
              setIsEditVisible(false);
              Alert.alert("Antrenman", "Antrenman güncellendi.");
            },
            onError: () => Alert.alert("Antrenman", "Antrenman güncellenemedi.")
          });
        }}
      />
    </ScreenShell>
  );
}

const ATTENDANCE_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "Present", label: "Geldi" },
  { status: "Absent", label: "Gelmedi" },
  { status: "Late", label: "Geç" },
  { status: "Excused", label: "İzinli" }
];

function AttendanceRow({ athlete, status, onChange }: {
  athlete: CoachAttendanceRosterItem;
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceHeader}>
        <InitialsAvatar label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={42} tone="dark" />
        <View style={styles.flexOne}>
          <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
          <Text style={styles.athleteMeta}>Veli: {athlete.parentFullName}</Text>
        </View>
      </View>
      <View style={styles.statusGroup}>
        {ATTENDANCE_OPTIONS.map((option) => {
          const selected = option.status === status;
          return (
            <Pressable
              key={option.status}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.status)}
              style={[styles.statusChip, selected && styles.statusChipSelected]}
            >
              <Text style={[styles.statusChipText, selected && styles.statusChipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type EditTrainingFormState = {
  groupIds: string[];
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

function EditTrainingModal({ groups, saving, training, visible, onClose, onSubmit }: {
  groups: SchoolGroupResponse[];
  saving: boolean;
  training: CoachAttendanceRosterTraining;
  visible: boolean;
  onClose: () => void;
  onSubmit: (request: UpdateCoachTrainingRequest) => void;
}) {
  const [form, setForm] = useState<EditTrainingFormState>(() => toEditForm(training));

  function openState() {
    setForm(toEditForm(training));
  }

  function submit() {
    if (form.groupIds.length === 0) {
      Alert.alert("Antrenman", "Lütfen en az bir grup seçin.");
      return;
    }

    if (!form.title.trim()) {
      Alert.alert("Antrenman", "Lütfen antrenman başlığını doldurun.");
      return;
    }

    const startsAt = buildDateTime(form.date, form.startTime);
    const endsAt = buildDateTime(form.date, form.endTime);
    if (!startsAt || !endsAt) {
      Alert.alert("Antrenman", "Lütfen tarih ve saat formatlarını kontrol edin.");
      return;
    }

    if (endsAt <= startsAt) {
      Alert.alert("Antrenman", "Bitiş saati başlangıç saatinden sonra olmalı.");
      return;
    }

    onSubmit({
      groupIds: form.groupIds,
      title: form.title.trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} onShow={openState} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Antrenmanı Düzenle</Text>
              <Text style={styles.mutedText}>{training.title}</Text>
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TextField label="Başlık" value={form.title} onChangeText={(title) => setForm((current) => ({ ...current, title }))} placeholder="Antrenman başlığı" />

            <View style={styles.inputRow}>
              <TextField label="Tarih" value={form.date} onChangeText={(date) => setForm((current) => ({ ...current, date }))} placeholder="2026-05-29" />
            </View>
            <View style={styles.timeRow}>
              <TextField label="Başlangıç" value={form.startTime} onChangeText={(startTime) => setForm((current) => ({ ...current, startTime }))} placeholder="17:00" />
              <TextField label="Bitiş" value={form.endTime} onChangeText={(endTime) => setForm((current) => ({ ...current, endTime }))} placeholder="18:30" />
            </View>

            <TextField label="Konum" value={form.location} onChangeText={(location) => setForm((current) => ({ ...current, location }))} placeholder="Saha 1" />
            <TextField label="Açıklama" multiline value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="Opsiyonel açıklama" />

            <View style={styles.groupPickerSection}>
              <Text style={styles.sectionLabel}>Gruplar</Text>
              {groups.map((group) => {
                const active = form.groupIds.includes(group.id);
                return (
                  <Pressable key={group.id} onPress={() => setForm((current) => ({ ...current, groupIds: toggleGroupId(current.groupIds, group.id) }))} style={[styles.groupOption, active && styles.groupOptionActive]}>
                    <View style={[styles.checkbox, active && styles.checkboxSelected]}>
                      {active ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}
                    </View>
                    <Text style={[styles.groupOptionText, active && styles.groupOptionTextActive]}>{group.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={submit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function formatTrainingDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(new Date(value));
}

function toEditForm(training: CoachAttendanceRosterTraining): EditTrainingFormState {
  const startsAt = new Date(training.startsAt);
  const endsAt = new Date(training.endsAt);
  return {
    groupIds: training.groups.map((group) => group.id),
    title: training.title,
    date: formatDateInput(startsAt),
    startTime: formatTimeInput(startsAt),
    endTime: formatTimeInput(endsAt),
    location: training.location ?? "",
    notes: training.notes ?? ""
  };
}

function buildDateTime(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!dateMatch || !timeMatch) {
    return null;
  }

  return new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function toggleGroupId(groupIds: string[], groupId: string) {
  return groupIds.includes(groupId) ? groupIds.filter((id) => id !== groupId) : [...groupIds, groupId];
}

const styles = StyleSheet.create({
  athleteList: { gap: spacing.sm },
  athleteMeta: { ...typography.body, color: colors.onSurfaceVariant },
  athleteName: { ...typography.bodyLarge, color: colors.primary, fontFamily: "Inter_700Bold" },
  attendanceHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  attendanceRow: { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, gap: spacing.sm, paddingVertical: spacing.md },
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  bodyText: { ...typography.bodyLarge, color: colors.onSurface, lineHeight: 24 },
  card: { gap: spacing.md },
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  closeButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  detailHeader: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  editButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  eyebrow: { ...typography.label, color: colors.secondary, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  groupList: { gap: spacing.sm },
  groupOption: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  groupOptionActive: { backgroundColor: colors.surfaceContainerLow },
  groupOptionText: { ...typography.bodyLarge, color: colors.onSurface },
  groupOptionTextActive: { color: colors.primary, fontFamily: "Inter_700Bold" },
  groupPickerSection: { gap: spacing.xs },
  groupRow: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  headerCopy: { flex: 1, gap: spacing.xs },
  headingText: { ...typography.headline, color: colors.primary },
  inputRow: { gap: spacing.md },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "88%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  mutedText: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primaryText: { ...typography.bodyLarge, color: colors.primary },
  sectionLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  statusChip: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexGrow: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  statusChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { ...typography.label, color: colors.onSurfaceVariant },
  statusChipTextSelected: { color: colors.onPrimary },
  statusGroup: { flexDirection: "row", gap: spacing.xs },
  summaryCard: { gap: spacing.lg },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(104,253,179,0.22)", borderRadius: radius.lg, height: 52, justifyContent: "center", width: 52 },
  summaryTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  timeRow: { flexDirection: "row", gap: spacing.md }
});
