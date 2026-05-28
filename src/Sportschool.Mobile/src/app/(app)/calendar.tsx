import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useSchoolGroups, useCoachTrainings, useCreateCoachTraining } from "@/features/coach/api";
import type { SchoolGroupResponse, CreateCoachTrainingRequest } from "@/features/coach/types";
import { useGroups, useTrainings } from "@/features/me/api";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, Pill, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatMonth, formatTime } from "@/shared/utils/date";

type TrainingItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  groupId: string;
  location: string | null;
  groupName?: string;
  totalAthletes?: number;
};

type TrainingFormState = {
  groupId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
};

const initialTrainingForm: TrainingFormState = {
  groupId: "",
  title: "Antrenman",
  startTime: "17:00",
  endTime: "18:30",
  location: "",
  notes: ""
};

export default function CalendarScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const monthRange = useMemo(() => getMonthRange(visibleMonth), [visibleMonth]);
  const trainingsQuery = useTrainings(!isCoach, monthRange);
  const groupsQuery = useGroups(!isCoach);
  const coachTrainingsQuery = useCoachTrainings(isCoach, monthRange);

  if ((isCoach ? coachTrainingsQuery : trainingsQuery).isLoading) {
    return <LoadingState label="Antrenmanlar yükleniyor" />;
  }

  const trainings = ((isCoach ? coachTrainingsQuery.data : trainingsQuery.data) ?? []) as TrainingItem[];
  const markedDates = new Set(trainings.map((training) => getDateKey(new Date(training.startsAt))));
  const selectedTrainings = trainings.filter((training) => isSameDate(new Date(training.startsAt), selectedDate));

  function changeMonth(offset: number) {
    const nextMonth = addMonths(visibleMonth, offset);
    setVisibleMonth(nextMonth);
    setSelectedDate((current) => new Date(nextMonth.getFullYear(), nextMonth.getMonth(), Math.min(current.getDate(), getDaysInMonth(nextMonth))));
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={isCoach ? undefined : <InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "E"} size={42} tone="dark" />}>
      {isCoach ? (
        <CoachCalendar
          markedDates={markedDates}
          selectedDate={selectedDate}
          selectedTrainings={selectedTrainings}
          visibleMonth={visibleMonth}
          onChangeMonth={changeMonth}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <MemberCalendar
          groupName={(groupId) => groupsQuery.data?.find((group) => group.id === groupId)?.name ?? "A Takımı"}
          markedDates={markedDates}
          selectedDate={selectedDate}
          selectedTrainings={selectedTrainings}
          visibleMonth={visibleMonth}
          onChangeMonth={changeMonth}
          onSelectDate={setSelectedDate}
        />
      )}
    </ScreenShell>
  );
}

function CoachCalendar({ markedDates, selectedDate, selectedTrainings, visibleMonth, onChangeMonth, onSelectDate }: CalendarViewProps) {
  const groupsQuery = useSchoolGroups();
  const createTraining = useCreateCoachTraining();
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [form, setForm] = useState(initialTrainingForm);
  const groups = groupsQuery.data ?? [];

  function openCreateTraining() {
    if (groups.length === 0) {
      Alert.alert("Takvim", "Etkinlik eklemek için önce aktif bir grup olmalı.");
      return;
    }

    setForm(initialTrainingForm);
    setIsCreateVisible(true);
  }

  function submitTraining() {
    if (!form.groupId) {
      Alert.alert("Takvim", "Lütfen antrenman yapılacak grubu seçin.");
      return;
    }

    if (!form.title.trim()) {
      Alert.alert("Takvim", "Lütfen antrenman başlığını doldurun.");
      return;
    }

    const startsAt = buildDateTime(selectedDate, form.startTime);
    const endsAt = buildDateTime(selectedDate, form.endTime);
    
    if (!startsAt || !endsAt) {
      Alert.alert("Takvim", "Lütfen saatleri kontrol edin.");
      return;
    }

    if (endsAt <= startsAt) {
      Alert.alert("Takvim", "Bitiş saati başlangıç saatinden sonra olmalı.");
      return;
    }

    const request: CreateCoachTrainingRequest = {
      groupId: form.groupId,
      title: form.title.trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      recurrence: "None",
      recurrenceEndsOn: null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null
    };

    createTraining.mutate(request, {
      onSuccess: () => {
        setIsCreateVisible(false);
        Alert.alert("Takvim", "Etkinlik kaydedildi.");
      },
      onError: () => Alert.alert("Takvim", "Etkinlik kaydedilemedi.")
    });
  }

  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.coachTitle}>Antrenman Takvimi</Text>
        <View style={styles.segmented}>
          <View style={styles.segmentedActive}><Text style={styles.segmentedActiveText}>Aylık</Text></View>
          <View style={styles.segmentedInactive}><Text style={styles.segmentedInactiveText}>Haftalık</Text></View>
        </View>
      </View>
      <CalendarPanel
        markedDates={markedDates}
        roundedDays
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onChangeMonth={onChangeMonth}
        onSelectDate={onSelectDate}
      />
      <ScheduleList
        coach
        subtitle={`${selectedTrainings.length} Planlı Antrenman`}
        title={formatSelectedDate(selectedDate)}
        trainings={selectedTrainings}
        onAddPress={openCreateTraining}
      />
      <CreateTrainingModal
        form={form}
        groups={groups}
        saving={createTraining.isPending}
        selectedDate={selectedDate}
        visible={isCreateVisible}
        onChangeForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setIsCreateVisible(false)}
        onSubmit={submitTraining}
      />
    </>
  );
}

function MemberCalendar({ groupName, markedDates, selectedDate, selectedTrainings, visibleMonth, onChangeMonth, onSelectDate }: CalendarViewProps & { groupName: (groupId: string) => string }) {
  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.memberTitle}>Antrenman Programı</Text>
        <Text style={styles.subtitle}>{formatMonth(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1)}</Text>
      </View>
      <CalendarPanel
        markedDates={markedDates}
        selectedDate={selectedDate}
        visibleMonth={visibleMonth}
        onChangeMonth={onChangeMonth}
        onSelectDate={onSelectDate}
      />
      <ScheduleList title={formatSelectedDate(selectedDate)} subtitle={`${selectedTrainings.length} Etkinlik`} trainings={selectedTrainings} groupName={groupName} />
    </>
  );
}

type CalendarViewProps = {
  markedDates: Set<string>;
  selectedDate: Date;
  selectedTrainings: TrainingItem[];
  visibleMonth: Date;
  onChangeMonth: (offset: number) => void;
  onSelectDate: (date: Date) => void;
};

function CalendarPanel({ markedDates, roundedDays, selectedDate, visibleMonth, onChangeMonth, onSelectDate }: Omit<CalendarViewProps, "selectedTrainings"> & { roundedDays?: boolean }) {
  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const monthTitle = formatMonth(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1);

  return (
    <SurfaceCard style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthTitle}>{monthTitle}</Text>
        <View style={styles.calendarArrows}>
          <Pressable accessibilityLabel="Önceki ay" onPress={() => onChangeMonth(-1)} style={styles.circleButton}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Pressable accessibilityLabel="Sonraki ay" onPress={() => onChangeMonth(1)} style={styles.circleButton}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>
      <View style={styles.weekRow}>{["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => <Text key={day} style={styles.weekText}>{day}</Text>)}</View>
      <View style={styles.daysGrid}>
        {cells.map((cell) => {
          const selected = isSameDate(cell.date, selectedDate);
          const hasTraining = markedDates.has(getDateKey(cell.date));
          return (
            <Pressable key={cell.key} disabled={!cell.isCurrentMonth} onPress={() => onSelectDate(cell.date)} style={styles.dayCell}>
              <View style={[styles.dayInner, roundedDays && styles.dayCellRound, selected && styles.daySelected]}>
                <Text style={[styles.dayText, !cell.isCurrentMonth && styles.dayTextInactive, selected && styles.dayTextSelected]}>{cell.date.getDate()}</Text>
                <View style={styles.dotRow}>
                  {hasTraining ? <View style={[styles.dot, selected && styles.dotSelected, { backgroundColor: selected ? colors.secondaryContainer : colors.primary }]} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legendRow}>
        <Legend color={colors.primary} label="Antrenman" />
      </View>
    </SurfaceCard>
  );
}

function ScheduleList({ title, subtitle, trainings, coach, groupName, onAddPress }: { title: string; subtitle: string; trainings: TrainingItem[]; coach?: boolean; groupName?: (groupId: string) => string; onAddPress?: () => void }) {
  return (
    <View style={styles.scheduleWrap}>
      <View style={styles.scheduleHeader}>
        <View>
          <Text style={styles.scheduleTitle}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {coach && onAddPress ? (
          <Pressable onPress={onAddPress} style={styles.addButton}>
            <Text style={styles.addLink}>+ Yeni Ekle</Text>
          </Pressable>
        ) : null}
      </View>
      {trainings.length === 0 ? (
        <SurfaceCard>
          <EmptyState title="Program boş" description="Seçili günde görüntülenecek antrenman bulunmuyor." />
        </SurfaceCard>
      ) : (
        trainings.map((training, index) => <TrainingCard key={training.id} training={training} accent={index === 0 ? "secondary" : "warning"} coach={coach} group={training.groupName ?? groupName?.(training.groupId) ?? "A Takımı"} />)
      )}
    </View>
  );
}

function TrainingCard({ training, accent, coach, group }: { training: TrainingItem; accent: "secondary" | "warning"; coach?: boolean; group: string }) {
  const accentColor = accent === "secondary" ? colors.secondary : colors.tertiaryFixedDim;
  return (
    <SurfaceCard style={styles.trainingCard}>
      <View style={[styles.trainingAccent, { backgroundColor: accentColor }]} />
      <View style={styles.trainingTopRow}>
        <View style={styles.trainingTimeBlock}>
          <Text style={styles.trainingTime}>{formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
          <Text style={styles.trainingEnd}>{group}</Text>
        </View>
        {!coach ? <Pill label="Antrenman" tone={accent === "secondary" ? "success" : "neutral"} icon="soccer" /> : null}
      </View>
      <View style={styles.tagRow}>
        {coach ? <Pill label={training.title.toLowerCase().includes("kondisyon") ? "Kondisyon" : "Antrenman"} tone="neutral" /> : null}
        {coach && accent === "secondary" ? <Pill label="Planlı" tone="success" /> : null}
      </View>
      <Text style={styles.trainingTitle}>{training.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{training.location ?? (coach ? "Konum girilmedi" : "Tesis bilgisi yok")}</Text>
        <Text style={styles.metaText}>{coach ? `${training.totalAthletes ?? 0} sporcu` : group}</Text>
      </View>
    </SurfaceCard>
  );
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

function CreateTrainingModal({ form, groups, saving, selectedDate, visible, onChangeForm, onClose, onSubmit }: {
  form: TrainingFormState;
  groups: SchoolGroupResponse[];
  saving: boolean;
  selectedDate: Date;
  visible: boolean;
  onChangeForm: (patch: Partial<TrainingFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [timePickerTarget, setTimePickerTarget] = useState<"startTime" | "endTime" | null>(null);
  const [selectedHour, setSelectedHour] = useState("17");
  const [selectedMinute, setSelectedMinute] = useState("00");

  function handleOpenTimePicker(target: "startTime" | "endTime") {
    const currentValue = target === "startTime" ? form.startTime : form.endTime;
    const [h, m] = currentValue.split(":");
    setSelectedHour(h || "17");
    setSelectedMinute(m || "00");
    setTimePickerTarget(target);
  }

  function handleConfirmTime() {
    if (timePickerTarget) {
      onChangeForm({ [timePickerTarget]: `${selectedHour}:${selectedMinute}` });
    }
    setTimePickerTarget(null);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Yeni Antrenman</Text>
              <Text style={styles.subtitle}>{formatSelectedDate(selectedDate)}</Text>
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.groupOptions}>
              {groups.map((group) => {
                const selected = group.id === form.groupId;
                return (
                  <Pressable key={group.id} onPress={() => onChangeForm({ groupId: group.id })} style={[styles.groupOption, selected && styles.groupOptionSelected]}>
                    <Text style={[styles.groupOptionText, selected && styles.groupOptionTextSelected]}>{group.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField label="Başlık" value={form.title} onChangeText={(value) => onChangeForm({ title: value })} placeholder="Antrenman başlığı" />
            
            <View style={styles.timeRow}>
              <Pressable onPress={() => handleOpenTimePicker("startTime")} style={styles.timePickerButton}>
                <Text style={styles.timePickerLabel}>Başlangıç</Text>
                <View style={styles.timePickerBox}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
                  <Text style={styles.timePickerValue}>{form.startTime}</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => handleOpenTimePicker("endTime")} style={styles.timePickerButton}>
                <Text style={styles.timePickerLabel}>Bitiş</Text>
                <View style={styles.timePickerBox}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={colors.primary} />
                  <Text style={styles.timePickerValue}>{form.endTime}</Text>
                </View>
              </Pressable>
            </View>

            <TextField label="Konum" value={form.location} onChangeText={(value) => onChangeForm({ location: value })} placeholder="Saha 1" />
            <TextField label="Not" multiline value={form.notes} onChangeText={(value) => onChangeForm({ notes: value })} placeholder="Opsiyonel not" />
            <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={onSubmit} />
          </ScrollView>
        </View>
      </View>

      {timePickerTarget && (
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerCard}>
            <Text style={styles.timePickerTitle}>
              {timePickerTarget === "startTime" ? "Başlangıç Saati" : "Bitiş Saati"}
            </Text>
            
            <View style={styles.pickerColumns}>
              {/* Saat Sütunu */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Saat</Text>
                <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                  {hours.map((h) => {
                    const active = h === selectedHour;
                    return (
                      <Pressable key={h} onPress={() => setSelectedHour(h)} style={[styles.optionItem, active && styles.optionItemActive]}>
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{h}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Dakika Sütunu */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Dakika</Text>
                <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                  {minutes.map((m) => {
                    const active = m === selectedMinute;
                    return (
                      <Pressable key={m} onPress={() => setSelectedMinute(m)} style={[styles.optionItem, active && styles.optionItemActive]}>
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{m}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            <View style={styles.pickerActions}>
              <Button label="İptal" variant="outline" onPress={() => setTimePickerTarget(null)} />
              <Button label="Tamam" onPress={handleConfirmTime} />
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function buildMonthCells(month: Date) {
  const monthStart = startOfMonth(month);
  const leadingDays = (monthStart.getDay() + 6) % 7;
  const gridStart = addDays(monthStart, -leadingDays);
  const cellCount = Math.ceil((leadingDays + getDaysInMonth(monthStart)) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(gridStart, index);
    return {
      date,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      key: getDateKey(date)
    };
  });
}

function getMonthRange(month: Date) {
  const start = startOfMonth(month);
  const end = addMonths(start, 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

function buildDateTime(date: Date, time: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(match[1]), Number(match[2]));
}

function formatSelectedDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(date);
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

const styles = StyleSheet.create({
  addButton: { paddingVertical: spacing.sm },
  addLink: { ...typography.label, color: colors.secondary, fontSize: 14 },
  calendarArrows: { flexDirection: "row", gap: spacing.sm },
  calendarCard: { gap: spacing.lg, minHeight: 430 },
  calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  circleButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, height: 46, justifyContent: "center", width: 46 },
  closeButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  coachTitle: { ...typography.headline, color: colors.primary },
  dayCell: { alignItems: "center", flexBasis: `${100 / 7}%`, height: 52, justifyContent: "center" },
  dayCellRound: { borderRadius: radius.full },
  dayInner: { alignItems: "center", height: 46, justifyContent: "center", width: 46 },
  daySelected: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.16, shadowRadius: 7, shadowOffset: { height: 4, width: 0 } },
  dayText: { ...typography.bodyLarge, color: colors.primary },
  dayTextInactive: { color: colors.outlineVariant },
  dayTextSelected: { color: colors.onPrimary, fontFamily: "Inter_700Bold" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.xs },
  dot: { borderRadius: 3, height: 6, width: 6 },
  dotRow: { flexDirection: "row", gap: 2, height: 8, marginTop: 2 },
  dotSelected: { backgroundColor: colors.secondaryContainer },
  groupOption: { borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  groupOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  groupOptionText: { ...typography.label, color: colors.primary },
  groupOptionTextSelected: { color: colors.onPrimary },
  groupOptions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  headerBlock: { gap: spacing.lg },
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  legendRow: { flexDirection: "row", gap: spacing.xl, justifyContent: "center" },
  legendText: { ...typography.label, color: colors.onSurfaceVariant },
  memberTitle: { ...typography.display, color: colors.primary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.sm },
  metaText: { ...typography.body, color: colors.onSurfaceVariant },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "88%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  monthTitle: { ...typography.title, color: colors.primary },
  scheduleHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  scheduleTitle: { ...typography.headline, color: colors.primary },
  scheduleWrap: { gap: spacing.md },
  segmented: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  segmentedActive: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flex: 1, padding: spacing.md },
  segmentedActiveText: { ...typography.label, color: colors.onPrimary },
  segmentedInactive: { alignItems: "center", flex: 1, padding: spacing.md },
  segmentedInactiveText: { ...typography.label, color: colors.onSurfaceVariant },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  tagRow: { flexDirection: "row", gap: spacing.sm },
  timeRow: { flexDirection: "row", gap: spacing.md },
  timePickerButton: { flex: 1, gap: spacing.xs },
  timePickerLabel: { ...typography.label, color: colors.onSurfaceVariant },
  timePickerBox: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, height: 50, paddingHorizontal: spacing.md },
  timePickerValue: { ...typography.bodyLarge, color: colors.onSurface },
  timePickerOverlay: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0, zIndex: 1000 },
  timePickerCard: { backgroundColor: colors.surface, borderRadius: radius.lg, gap: spacing.md, padding: spacing.lg, width: "80%" },
  timePickerTitle: { ...typography.title, color: colors.primary, textAlign: "center" },
  pickerColumns: { flexDirection: "row", gap: spacing.lg, height: 200 },
  pickerColumn: { flex: 1 },
  columnLabel: { ...typography.label, color: colors.outline, marginBottom: spacing.xs, textAlign: "center" },
  columnScroll: { borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1 },
  optionItem: { alignItems: "center", paddingVertical: spacing.md },
  optionItemActive: { backgroundColor: colors.primaryContainer },
  optionText: { ...typography.body, color: colors.onSurface },
  optionTextActive: { color: colors.primary, fontFamily: "Inter_700Bold" },
  pickerActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end", marginTop: spacing.md },
  trainingAccent: { bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  trainingCard: { gap: spacing.md, paddingLeft: spacing.xl },
  trainingEnd: { ...typography.body, color: colors.outline },
  trainingTime: { ...typography.headline, color: colors.primary },
  trainingTimeBlock: { flex: 1 },
  trainingTitle: { ...typography.title, color: colors.primary },
  trainingTopRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekText: { ...typography.label, color: colors.outline, flex: 1, textAlign: "center" }
});
