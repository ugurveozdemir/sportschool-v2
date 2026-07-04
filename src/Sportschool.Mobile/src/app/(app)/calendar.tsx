import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useSchoolGroups, useCoachTrainings, useCreateCoachTraining } from "@/features/coach/api";
import type { SchoolGroupResponse, CreateCoachTrainingRequest } from "@/features/coach/types";
import { useTrainings } from "@/features/me/api";
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
  groups?: { id: string; name: string }[];
  location: string | null;
  notes?: string | null;
  totalAthletes?: number;
};

type TrainingFormState = {
  groupIds: string[];
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  date: Date;
  repeatWeekly: boolean;
};

type CalendarView = "week" | "month";

const initialTrainingForm: TrainingFormState = {
  groupIds: [],
  title: "Antrenman",
  startTime: "17:00",
  endTime: "18:30",
  location: "",
  notes: "",
  date: new Date(),
  repeatWeekly: false
};

export default function CalendarScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  // Both coaches and members open on the weekly view; either can switch to the month grid.
  const [view, setView] = useState<CalendarView>("week");
  const fetchRange = useMemo(
    () => (view === "week" ? getWeekRange(selectedDate) : getMonthRange(visibleMonth)),
    [view, selectedDate, visibleMonth]
  );
  const { selectedAthleteProfileId } = useAthleteSelection();
  const trainingsQuery = useTrainings(!isCoach, fetchRange, selectedAthleteProfileId);
  const coachTrainingsQuery = useCoachTrainings(isCoach, fetchRange);

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

  function changeWeek(offset: number) {
    setSelectedDate((current) => addDays(current, offset * 7));
  }

  function changeView(next: CalendarView) {
    if (next === "month") {
      setVisibleMonth(startOfMonth(selectedDate));
    }
    setView(next);
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={isCoach ? undefined : <InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "E"} size={42} tone="dark" />}>
      {isCoach ? (
        <CoachCalendar
          markedDates={markedDates}
          selectedDate={selectedDate}
          selectedTrainings={selectedTrainings}
          trainings={trainings}
          view={view}
          visibleMonth={visibleMonth}
          onChangeMonth={changeMonth}
          onChangeView={changeView}
          onChangeWeek={changeWeek}
          onSelectDate={setSelectedDate}
        />
      ) : (
        <MemberCalendar
          markedDates={markedDates}
          selectedDate={selectedDate}
          selectedTrainings={selectedTrainings}
          trainings={trainings}
          view={view}
          visibleMonth={visibleMonth}
          onChangeMonth={changeMonth}
          onChangeView={changeView}
          onChangeWeek={changeWeek}
          onSelectDate={setSelectedDate}
        />
      )}
    </ScreenShell>
  );
}

function CoachCalendar({ markedDates, selectedDate, selectedTrainings, trainings, view, visibleMonth, onChangeMonth, onChangeView, onChangeWeek, onSelectDate }: CalendarProps) {
  const groupsQuery = useSchoolGroups();
  const createTraining = useCreateCoachTraining();
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [form, setForm] = useState(initialTrainingForm);
  const groups = groupsQuery.data ?? [];

  function openCreateTraining(date?: Date) {
    if (groups.length === 0) {
      Alert.alert("Takvim", "Etkinlik eklemek için önce aktif bir grup olmalı.");
      return;
    }

    setForm({ ...initialTrainingForm, date: date ?? selectedDate });
    setIsCreateVisible(true);
  }

  function submitTraining() {
    if (form.groupIds.length === 0) {
      Alert.alert("Takvim", "Lütfen antrenman yapılacak en az bir grubu seçin.");
      return;
    }

    if (!form.title.trim()) {
      Alert.alert("Takvim", "Lütfen antrenman başlığını doldurun.");
      return;
    }

    const startsAt = buildDateTime(form.date, form.startTime);
    const endsAt = buildDateTime(form.date, form.endTime);

    if (!startsAt || !endsAt) {
      Alert.alert("Takvim", "Lütfen saatleri kontrol edin.");
      return;
    }

    if (endsAt <= startsAt) {
      Alert.alert("Takvim", "Bitiş saati başlangıç saatinden sonra olmalı.");
      return;
    }

    const request: CreateCoachTrainingRequest = {
      groupIds: form.groupIds,
      title: form.title.trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      recurrence: form.repeatWeekly ? "Weekly" : "None",
      // Repeat weekly for a year so the coach never has to re-add it; a day short of the
      // start's anniversary keeps us within the backend's one-year cap across time zones.
      recurrenceEndsOn: form.repeatWeekly ? getDateKey(addDays(addYears(form.date, 1), -1)) : null,
      location: form.location.trim() || null,
      notes: form.notes.trim() || null
    };

    createTraining.mutate(request, {
      onSuccess: () => {
        setIsCreateVisible(false);
        Alert.alert("Takvim", form.repeatWeekly ? "Haftalık tekrar eden antrenman oluşturuldu." : "Etkinlik kaydedildi.");
      },
      onError: () => Alert.alert("Takvim", "Etkinlik kaydedilemedi.")
    });
  }

  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.coachTitle}>Antrenman Takvimi</Text>
        <ViewToggle view={view} onChange={onChangeView} />
      </View>
      {view === "week" ? (
        <WeekAgenda
          selectedDate={selectedDate}
          trainings={trainings}
          onAddPress={openCreateTraining}
          onChangeWeek={onChangeWeek}
          onOpenTraining={(training) => router.push(`/trainings/${training.id}`)}
        />
      ) : (
        <>
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
            onAddPress={() => openCreateTraining()}
          />
        </>
      )}
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

function MemberCalendar({ markedDates, selectedDate, selectedTrainings, trainings, view, visibleMonth, onChangeMonth, onChangeView, onChangeWeek, onSelectDate }: CalendarProps) {
  const [detail, setDetail] = useState<TrainingItem | null>(null);
  return (
    <>
      <View style={styles.headerBlock}>
        <Text style={styles.memberTitle}>Antrenman Programı</Text>
        <ViewToggle view={view} onChange={onChangeView} />
      </View>
      {view === "week" ? (
        <WeekAgenda selectedDate={selectedDate} trainings={trainings} onChangeWeek={onChangeWeek} onOpenTraining={setDetail} />
      ) : (
        <>
          <CalendarPanel
            markedDates={markedDates}
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            onChangeMonth={onChangeMonth}
            onSelectDate={onSelectDate}
          />
          <ScheduleList title={formatSelectedDate(selectedDate)} subtitle={`${selectedTrainings.length} Etkinlik`} trainings={selectedTrainings} onItemPress={setDetail} />
        </>
      )}
      <TrainingDetailModal training={detail} onClose={() => setDetail(null)} />
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

type CalendarProps = CalendarViewProps & {
  trainings: TrainingItem[];
  view: CalendarView;
  onChangeView: (view: CalendarView) => void;
  onChangeWeek: (offset: number) => void;
};

function ViewToggle({ view, onChange }: { view: CalendarView; onChange: (view: CalendarView) => void }) {
  return (
    <View style={styles.segmented}>
      <Pressable onPress={() => onChange("week")} style={[styles.segment, view === "week" && styles.segmentActive]}>
        <Text style={view === "week" ? styles.segmentActiveText : styles.segmentInactiveText}>Haftalık</Text>
      </Pressable>
      <Pressable onPress={() => onChange("month")} style={[styles.segment, view === "month" && styles.segmentActive]}>
        <Text style={view === "month" ? styles.segmentActiveText : styles.segmentInactiveText}>Aylık</Text>
      </Pressable>
    </View>
  );
}

const weekdayLabels = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const weekdayFullLabels = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function WeekAgenda({ selectedDate, trainings, onChangeWeek, onAddPress, onOpenTraining }: {
  selectedDate: Date;
  trainings: TrainingItem[];
  onChangeWeek: (offset: number) => void;
  onAddPress?: (date: Date) => void;
  onOpenTraining?: (training: TrainingItem) => void;
}) {
  const weekStart = startOfWeek(selectedDate);
  const today = startOfDay(new Date());
  const days = useMemo(() => {
    const byDay = new Map<string, TrainingItem[]>();
    for (const training of trainings) {
      const key = getDateKey(new Date(training.startsAt));
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(training);
      } else {
        byDay.set(key, [training]);
      }
    }
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const items = (byDay.get(getDateKey(date)) ?? []).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      return { date, label: weekdayFullLabels[index], short: weekdayLabels[index], items };
    });
  }, [weekStart, trainings]);

  return (
    <View style={styles.weekAgenda}>
      <View style={styles.weekNav}>
        <Pressable accessibilityLabel="Önceki hafta" onPress={() => onChangeWeek(-1)} style={styles.circleButton}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.weekRangeTitle}>{formatWeekRange(weekStart)}</Text>
        <Pressable accessibilityLabel="Sonraki hafta" onPress={() => onChangeWeek(1)} style={styles.circleButton}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {days.map((day) => {
        const isToday = isSameDate(day.date, today);
        return (
          <SurfaceCard key={getDateKey(day.date)} style={isToday ? { ...styles.dayCard, ...styles.dayCardToday } : styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <View style={[styles.dateBadge, isToday && styles.dateBadgeToday]}>
                <Text style={[styles.dateBadgeWeekday, isToday && styles.dateBadgeTextToday]}>{day.short}</Text>
                <Text style={[styles.dateBadgeNumber, isToday && styles.dateBadgeTextToday]}>{day.date.getDate()}</Text>
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.dayName}>{day.label}</Text>
                <Text style={styles.dayCount}>{day.items.length > 0 ? `${day.items.length} antrenman` : "Boş gün"}</Text>
              </View>
              {onAddPress ? (
                <Pressable accessibilityLabel={`${day.label} için antrenman ekle`} hitSlop={8} onPress={() => onAddPress(day.date)} style={styles.dayAddButton}>
                  <MaterialCommunityIcons name="plus" size={20} color={colors.surface} />
                </Pressable>
              ) : null}
            </View>

            {day.items.length === 0 ? (
              <Text style={styles.dayEmpty}>Antrenman planlanmadı</Text>
            ) : (
              <View style={styles.dayItems}>
                {day.items.map((training) => (
                  <AgendaItem key={training.id} training={training} onOpen={onOpenTraining} />
                ))}
              </View>
            )}
          </SurfaceCard>
        );
      })}
    </View>
  );
}

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

function AgendaItem({ training, onOpen }: { training: TrainingItem; onOpen?: (training: TrainingItem) => void }) {
  const meta = [formatGroupNames(training.groups), training.location].filter(Boolean).join(" · ");
  const body = (
    <>
      <View style={styles.agendaTime}>
        <Text style={styles.agendaTimeStart}>{formatTime(training.startsAt)}</Text>
        <Text style={styles.agendaTimeEnd}>{formatTime(training.endsAt)}</Text>
      </View>
      <View style={styles.agendaBar} />
      <View style={styles.flexOne}>
        <Text style={styles.agendaTitle}>{training.title}</Text>
        <Text style={styles.agendaMeta} numberOfLines={1}>{meta}</Text>
      </View>
      {onOpen ? <MaterialCommunityIcons name="chevron-right" size={20} color={colors.outline} /> : null}
    </>
  );

  if (!onOpen) {
    return <View style={styles.agendaItem}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${training.title} detayını aç`}
      onPress={() => onOpen(training)}
      style={styles.agendaItem}
    >
      {body}
    </Pressable>
  );
}

function ScheduleList({ title, subtitle, trainings, coach, onAddPress, onItemPress }: { title: string; subtitle: string; trainings: TrainingItem[]; coach?: boolean; onAddPress?: () => void; onItemPress?: (training: TrainingItem) => void }) {
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
        trainings.map((training, index) => (
          <TrainingCard
            key={training.id}
            training={training}
            accent={index === 0 ? "secondary" : "warning"}
            coach={coach}
            onPress={onItemPress}
          />
        ))
      )}
    </View>
  );
}

function TrainingCard({ training, accent, coach, onPress }: { training: TrainingItem; accent: "secondary" | "warning"; coach?: boolean; onPress?: (training: TrainingItem) => void }) {
  const accentColor = accent === "secondary" ? colors.secondary : colors.tertiaryFixedDim;
  const groupText = formatGroupNames(training.groups);
  const content = (
    <>
      <View style={[styles.trainingAccent, { backgroundColor: accentColor }]} />
      <View style={styles.trainingTopRow}>
        <View style={styles.trainingTimeBlock}>
          <Text style={styles.trainingTime}>{formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
          <Text style={styles.trainingEnd}>{groupText}</Text>
        </View>
        {!coach ? <Pill label="Antrenman" tone={accent === "secondary" ? "success" : "neutral"} icon="soccer" /> : null}
        {coach ? <MaterialCommunityIcons name="chevron-right" size={22} color={colors.outline} /> : null}
      </View>
      <View style={styles.tagRow}>
        {coach ? <Pill label={training.title.toLowerCase().includes("kondisyon") ? "Kondisyon" : "Antrenman"} tone="neutral" /> : null}
        {coach && accent === "secondary" ? <Pill label="Planlı" tone="success" /> : null}
      </View>
      <Text style={styles.trainingTitle}>{training.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{training.location ?? (coach ? "Konum girilmedi" : "Tesis bilgisi yok")}</Text>
        <Text style={styles.metaText}>{coach ? `${training.totalAthletes ?? 0} sporcu` : groupText}</Text>
      </View>
    </>
  );

  if (coach) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${training.title} detayını aç`}
        onPress={() => router.push(`/trainings/${training.id}`)}
      >
        <SurfaceCard style={styles.trainingCard}>{content}</SurfaceCard>
      </Pressable>
    );
  }

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${training.title} detayını aç`}
        onPress={() => onPress(training)}
      >
        <SurfaceCard style={styles.trainingCard}>{content}</SurfaceCard>
      </Pressable>
    );
  }

  return (
    <SurfaceCard style={styles.trainingCard}>
      {content}
    </SurfaceCard>
  );
}

function TrainingDetailModal({ training, onClose }: { training: TrainingItem | null; onClose: () => void }) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={training !== null}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.flexOne}>
              <Text style={styles.modalTitle}>{training?.title}</Text>
              {training ? <Text style={styles.subtitle}>{formatSelectedDate(new Date(training.startsAt))}</Text> : null}
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          {training ? (
            <View style={styles.detailBody}>
              <DetailRow icon="clock-outline" label="Saat" value={`${formatTime(training.startsAt)} - ${formatTime(training.endsAt)}`} />
              <DetailRow icon="map-marker-outline" label="Konum" value={training.location ?? "Belirtilmedi"} />
              <DetailRow icon="account-group-outline" label="Grup" value={formatGroupNames(training.groups)} />
              {training.notes ? <DetailRow icon="note-text-outline" label="Antrenör notu" value={training.notes} /> : null}
            </View>
          ) : null}
          <Button label="Kapat" onPress={onClose} variant="outline" />
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.flexOne}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const monthsTurkish = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];
const years = [2026, 2027, 2028];
const days = Array.from({ length: 31 }, (_, i) => i + 1);

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
  const [isGroupPickerVisible, setIsGroupPickerVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  
  const [tempDay, setTempDay] = useState(selectedDate.getDate());
  const [tempMonth, setTempMonth] = useState(selectedDate.getMonth());
  const [tempYear, setTempYear] = useState(selectedDate.getFullYear());

  const selectedGroupNames = groups
    .filter((group) => form.groupIds.includes(group.id))
    .map((group) => group.name)
    .join(", ");

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

  function handleOpenDatePicker() {
    setTempDay(form.date.getDate());
    setTempMonth(form.date.getMonth());
    setTempYear(form.date.getFullYear());
    setIsDatePickerVisible(true);
  }

  function handleConfirmDate() {
    const maxDays = new Date(tempYear, tempMonth + 1, 0).getDate();
    const safeDay = Math.min(tempDay, maxDays);
    const newDate = new Date(tempYear, tempMonth, safeDay);
    onChangeForm({ date: newDate });
    setIsDatePickerVisible(false);
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
            {/* Custom Group Picker */}
            <Pressable onPress={() => setIsGroupPickerVisible(true)} style={styles.groupPickerButton}>
              <Text style={styles.groupPickerLabel}>Grup</Text>
              <View style={styles.groupPickerBox}>
                <MaterialCommunityIcons name="account-group-outline" size={18} color={colors.primary} />
                <Text style={[styles.groupPickerValue, form.groupIds.length === 0 && styles.groupPickerPlaceholder]}>
                  {selectedGroupNames || "Grupları Seçin..."}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.outline} />
              </View>
            </Pressable>

            {/* Custom Date Picker */}
            <Pressable onPress={handleOpenDatePicker} style={styles.groupPickerButton}>
              <Text style={styles.groupPickerLabel}>Tarih</Text>
              <View style={styles.groupPickerBox}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.groupPickerValue}>
                  {formatSelectedDate(form.date)}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.outline} />
              </View>
            </Pressable>

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
            <View style={styles.repeatRow}>
              <View style={styles.repeatTextBlock}>
                <Text style={styles.repeatLabel}>Her hafta tekrarla</Text>
                <Text style={styles.repeatHint}>Bu antrenman her hafta aynı gün ve saatte otomatik oluşturulur.</Text>
              </View>
              <Switch onValueChange={(value) => onChangeForm({ repeatWeekly: value })} value={form.repeatWeekly} />
            </View>
            <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={onSubmit} />
          </ScrollView>
        </View>

        {/* Time Picker Overlay */}
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

        {/* Group Picker Overlay */}
        {isGroupPickerVisible && (
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerCard}>
              <Text style={styles.timePickerTitle}>Grup Seçin</Text>
              <ScrollView style={styles.groupListScroll} showsVerticalScrollIndicator={false}>
                {groups.map((group) => {
                  const active = form.groupIds.includes(group.id);
                  return (
                    <Pressable
                      key={group.id}
                      onPress={() => {
                        onChangeForm({ groupIds: toggleGroupId(form.groupIds, group.id) });
                      }}
                      style={[styles.groupListItem, active && styles.groupListItemActive]}
                    >
                      <View style={[styles.checkbox, active && styles.checkboxSelected]}>
                        {active ? <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} /> : null}
                      </View>
                      <Text style={[styles.groupListText, active && styles.groupListTextActive]}>{group.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.pickerActions}>
                <Button label="İptal" variant="outline" onPress={() => setIsGroupPickerVisible(false)} />
                <Button label="Tamam" onPress={() => setIsGroupPickerVisible(false)} />
              </View>
            </View>
          </View>
        )}

        {/* Date Picker Overlay */}
        {isDatePickerVisible && (
          <View style={styles.timePickerOverlay}>
            <View style={[styles.timePickerCard, { width: "90%" }]}>
              <Text style={styles.timePickerTitle}>Tarih Seçin</Text>
              
              <View style={styles.pickerColumns}>
                {/* Gün Sütunu */}
                <View style={[styles.pickerColumn, { flex: 0.8 }]}>
                  <Text style={styles.columnLabel}>Gün</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {days.map((d) => {
                      const active = d === tempDay;
                      return (
                        <Pressable key={d} onPress={() => setTempDay(d)} style={[styles.optionItem, active && styles.optionItemActive]}>
                          <Text style={[styles.optionText, active && styles.optionTextActive]}>{d}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Ay Sütunu */}
                <View style={[styles.pickerColumn, { flex: 1.4 }]}>
                  <Text style={styles.columnLabel}>Ay</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {monthsTurkish.map((m, index) => {
                      const active = index === tempMonth;
                      return (
                        <Pressable key={m} onPress={() => setTempMonth(index)} style={[styles.optionItem, active && styles.optionItemActive]}>
                          <Text style={[styles.optionText, active && styles.optionTextActive]}>{m}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Yıl Sütunu */}
                <View style={[styles.pickerColumn, { flex: 1.2 }]}>
                  <Text style={styles.columnLabel}>Yıl</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {years.map((y) => {
                      const active = y === tempYear;
                      return (
                        <Pressable key={y} onPress={() => setTempYear(y)} style={[styles.optionItem, active && styles.optionItemActive]}>
                          <Text style={[styles.optionText, active && styles.optionTextActive]}>{y}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.pickerActions}>
                <Button label="İptal" variant="outline" onPress={() => setIsDatePickerVisible(false)} />
                <Button label="Tamam" onPress={handleConfirmDate} />
              </View>
            </View>
          </View>
        )}
      </View>
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

function getWeekRange(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 7);
  return { from: start.toISOString(), to: end.toISOString() };
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6);
  const formatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
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

function formatGroupNames(groups?: { name: string }[]) {
  if (!groups || groups.length === 0) {
    return "Grup bilgisi yok";
  }

  return groups.map((group) => group.name).join(", ");
}

function toggleGroupId(groupIds: string[], groupId: string) {
  return groupIds.includes(groupId) ? groupIds.filter((id) => id !== groupId) : [...groupIds, groupId];
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

function startOfWeek(date: Date) {
  const day = startOfDay(date);
  const mondayOffset = (day.getDay() + 6) % 7;
  return addDays(day, -mondayOffset);
}

function addYears(date: Date, years: number) {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
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
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
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
  groupPickerButton: { gap: spacing.xs },
  groupPickerLabel: { ...typography.label, color: colors.onSurfaceVariant },
  groupPickerBox: { alignItems: "center", borderColor: colors.outline, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, height: 50, paddingHorizontal: spacing.md },
  groupPickerValue: { ...typography.bodyLarge, color: colors.onSurface, flex: 1 },
  groupPickerPlaceholder: { color: colors.outline },
  groupListScroll: { maxHeight: 220, marginVertical: spacing.md },
  groupListItem: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  groupListItemActive: { backgroundColor: colors.primaryContainer },
  groupListText: { ...typography.bodyLarge, color: colors.onSurface },
  groupListTextActive: { color: colors.primary, fontFamily: "Inter_700Bold" },
  trainingAccent: { bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  trainingCard: { gap: spacing.md, paddingLeft: spacing.xl },
  trainingEnd: { ...typography.body, color: colors.outline },
  trainingTime: { ...typography.headline, color: colors.primary },
  trainingTimeBlock: { flex: 1 },
  trainingTitle: { ...typography.title, color: colors.primary },
  trainingTopRow: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  weekText: { ...typography.label, color: colors.outline, flex: 1, textAlign: "center" },
  segmented: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: radius.full, flex: 1, paddingVertical: spacing.md },
  segmentActive: { backgroundColor: colors.primary },
  segmentActiveText: { ...typography.label, color: colors.onPrimary },
  segmentInactiveText: { ...typography.label, color: colors.onSurfaceVariant },
  weekAgenda: { gap: spacing.md },
  weekNav: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  weekRangeTitle: { ...typography.title, color: colors.primary, textTransform: "capitalize" },
  dayCard: { gap: spacing.md },
  dayCardToday: { borderColor: colors.primary, borderWidth: 1.5 },
  dayCardHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  dateBadge: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, height: 52, justifyContent: "center", width: 52 },
  dateBadgeToday: { backgroundColor: colors.primary },
  dateBadgeWeekday: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  dateBadgeNumber: { ...typography.title, color: colors.primary },
  dateBadgeTextToday: { color: colors.onPrimary },
  dayName: { ...typography.title, color: colors.onSurface },
  dayCount: { ...typography.body, color: colors.onSurfaceVariant },
  dayAddButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, height: 38, justifyContent: "center", width: 38 },
  dayEmpty: { ...typography.body, color: colors.outline, paddingLeft: spacing.xs },
  dayItems: { gap: spacing.sm },
  agendaItem: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  agendaTime: { alignItems: "center", width: 44 },
  agendaTimeStart: { ...typography.label, color: colors.primary },
  agendaTimeEnd: { ...typography.body, color: colors.outline },
  agendaBar: { alignSelf: "stretch", backgroundColor: colors.secondary, borderRadius: 3, width: 4 },
  agendaTitle: { ...typography.title, color: colors.primary },
  agendaMeta: { ...typography.body, color: colors.onSurfaceVariant, marginTop: 2 },
  flexOne: { flex: 1 },
  detailBody: { gap: spacing.md },
  detailRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  detailIcon: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, height: 40, justifyContent: "center", width: 40 },
  detailLabel: { ...typography.label, color: colors.onSurfaceVariant },
  detailValue: { ...typography.bodyLarge, color: colors.onSurface },
  repeatRow: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  repeatTextBlock: { flex: 1, gap: spacing.xs },
  repeatLabel: { ...typography.title, color: colors.onSurface },
  repeatHint: { ...typography.body, color: colors.onSurfaceVariant }
});
