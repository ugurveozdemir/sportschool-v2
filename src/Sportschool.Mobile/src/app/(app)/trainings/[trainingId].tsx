import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { useSession } from "@/core/sessionProvider";
import { useCompleteCoachTraining, useCoachAttendanceRoster, useSaveCoachAttendanceBatch, useSaveTrainingReport, useSchoolGroups, useStartCoachTraining, useUpdateCoachTraining } from "@/features/coach/api";
import type { SaveCoachAttendanceItem } from "@/features/coach/api";
import type { CoachAttendanceRosterItem, CoachAttendanceRosterTraining, SaveTrainingReportRequest, SchoolGroupResponse, UpdateCoachTrainingRequest } from "@/features/coach/types";
import type { AttendanceStatus } from "@/shared/constants/domain";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { CircularScore, Pill, ProfileAvatar, ScreenShell, SurfaceCard } from "@/shared/components/MobileUi";
import { resolveApiUrl } from "@/shared/api/apiClient";
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
  const startTraining = useStartCoachTraining(isCoach ? trainingId : undefined);
  const completeTraining = useCompleteCoachTraining(isCoach ? trainingId : undefined);
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});
  const [reportAthlete, setReportAthlete] = useState<CoachAttendanceRosterItem | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const rosterAthletes = rosterQuery.data?.athletes;
  useEffect(() => {
    if (!rosterAthletes) {
      return;
    }
    setStatuses(Object.fromEntries(rosterAthletes.map((athlete) => [athlete.athleteProfileId, athlete.status])));
  }, [rosterAthletes]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const submitAttendance = () => {
    if (!rosterQuery.data?.training.startedAt || rosterQuery.data.training.completedAt) {
      Alert.alert("Yoklama", "Yoklama yalnızca devam eden antrenmanda alınabilir.");
      return;
    }
    const athletes = rosterQuery.data?.athletes ?? [];
    const items = athletes.reduce<SaveCoachAttendanceItem[]>((pending, athlete) => {
      const target = statuses[athlete.athleteProfileId] ?? "Present";
      pending.push({ athleteProfileId: athlete.athleteProfileId, status: target, existing: athlete.status !== null });
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

  function start() {
    startTraining.mutate(undefined, {
      onSuccess: () => Alert.alert("Antrenman", "Antrenman başlatıldı ve ilgili gruplara duyuru gönderildi."),
      onError: () => Alert.alert("Antrenman", "Antrenman başlatılamadı. Lütfen tekrar deneyin.")
    });
  }

  function complete() {
    completeTraining.mutate(undefined, {
      onSuccess: () => Alert.alert("Antrenman", "Antrenman tamamlandı. Artık oyuncu raporlarını girebilirsin."),
      onError: () => Alert.alert("Antrenman", "Önce tüm oyuncuların yoklamasını kaydetmelisin.")
    });
  }

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
  const trainingStarted = training.startedAt !== null;
  const trainingCompleted = training.completedAt !== null;
  const attendanceOpen = trainingStarted && !trainingCompleted;
  const startWindowAt = new Date(training.startsAt).getTime() - 2 * 60 * 60 * 1000;
  const startWindowOpen = now >= startWindowAt;
  const allAttendanceRecorded = athletes.every((athlete) => statuses[athlete.athleteProfileId] !== null);
  const attendanceHint = trainingCompleted
    ? "Antrenman tamamlandı. Yoklama kilitlendi."
    : trainingStarted
      ? "Oyuncuları Geldi veya Gelmedi olarak işaretle ve yoklamayı kaydet."
      : startWindowOpen
        ? "Önce antrenmanı başlat. Başlatınca bu antrenmanın oyuncu listesi sabitlenir."
        : `Antrenman ${formatTime(new Date(startWindowAt).toISOString())} itibarıyla başlatılabilir.`;
  const startsAt = new Date(training.startsAt);
  const day = new Intl.DateTimeFormat("tr-TR", { day: "2-digit" }).format(startsAt);
  const month = new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(startsAt).replace(".", "");
  const presentCount = athletes.filter((athlete) => statuses[athlete.athleteProfileId] === "Present").length;
  const attendanceRate = athletes.length === 0 ? 0 : Math.round((presentCount / athletes.length) * 100);

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable accessibilityLabel="Geri dön" onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headingText}>Antrenman Detayı</Text>
        </View>
        <Pressable accessibilityLabel="Antrenmanı düzenle" disabled={trainingStarted} onPress={() => setIsEditVisible(true)} style={[styles.editButton, trainingStarted && styles.disabledAction]}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <SurfaceCard style={styles.trainingSummary}>
        <View style={styles.trainingSummaryTop}>
          <View style={styles.trainingDate}>
            <View style={styles.trainingDateLine}>
              <Text style={styles.trainingDay}>{day}</Text>
              <Text style={styles.trainingMonth}>{month}</Text>
            </View>
            <View style={styles.trainingTimeLine}>
              <MaterialCommunityIcons name="clock-outline" size={19} color={colors.primary} />
              <Text style={styles.trainingTime}>{formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
            </View>
          </View>
          <View style={styles.trainingStatus}>
            <Pill label={trainingCompleted ? "TAMAMLANDI" : trainingStarted ? "DEVAM EDİYOR" : "PLANLANDI"} tone={trainingCompleted ? "success" : "primary"} />
            <Text style={styles.trainingDateFull}>{formatTrainingDate(training.startsAt)}</Text>
          </View>
        </View>
        <View style={styles.trainingDivider} />
        <View style={styles.trainingTitleRow}>
          <View style={styles.flexOne}>
            <Text style={styles.trainingTitle}>{training.title}</Text>
            <View style={styles.trainingLocation}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.mutedText}>{training.location ?? "Konum girilmedi"}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="dumbbell" size={25} color={colors.primary} />
        </View>
      </SurfaceCard>

      {!trainingStarted ? <Button disabled={startTraining.isPending || !startWindowOpen} label={startTraining.isPending ? "Başlatılıyor" : startWindowOpen ? "Antrenmanı Başlat" : `Saat ${formatTime(new Date(startWindowAt).toISOString())}'da Aktifleşir`} onPress={start} /> : null}

      <SurfaceCard style={styles.groupSummary}>
        <View style={styles.groupSummaryHeader}>
          <Text style={styles.groupSummaryTitle}>Sporcu Grubu</Text>
          <MaterialCommunityIcons name="account-group" size={25} color={colors.onSurfaceVariant} />
        </View>
        <Text style={styles.groupNames}>
          {training.groups.map((group) => group.name).join(", ") || "Grup atanmamış"}
        </Text>
        <Text style={styles.groupCount}>{athletes.length} sporcu</Text>
        {notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>ANTRENMAN NOTU</Text>
            <Text style={styles.bodyText}>{notes}</Text>
          </View>
        ) : null}
      </SurfaceCard>

      <SurfaceCard style={styles.attendanceSummary}>
        <Text style={styles.groupSummaryTitle}>Katılım Özeti</Text>
        <View style={styles.attendanceSummaryContent}>
          <CircularScore color={colors.primary} label="Katılım" size={70} value={attendanceRate} />
          <View style={styles.attendanceNumbers}>
            <Text style={styles.attendanceCount}>{presentCount} <Text style={styles.attendanceTotal}>/ {athletes.length}</Text></Text>
            <Text style={styles.mutedText}>Sporcu katılıyor</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.rosterCard}>
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>Sporcu Listesi</Text>
          <View style={styles.rosterCount}>
            <Text style={styles.rosterCountText}>{athletes.length} Sporcu</Text>
          </View>
        </View>
        {athletes.length === 0 ? (
          <EmptyState title="Oyuncu yok" description="Bu antrenmana bağlı gruplarda aktif oyuncu bulunmuyor." />
        ) : (
          <>
            <Text style={attendanceOpen ? styles.mutedText : styles.warningText}>{attendanceHint}</Text>
            <View style={styles.athleteList}>
              {athletes.map((athlete) => (
                <AttendanceRow
                  key={athlete.athleteProfileId}
                  athlete={athlete}
                  status={statuses[athlete.athleteProfileId] ?? "Present"}
                  disabled={!attendanceOpen}
                  onChange={(status) => setStatuses((current) => ({ ...current, [athlete.athleteProfileId]: status }))}
                />
              ))}
            </View>
            <Button
              disabled={saveAttendance.isPending || !attendanceOpen}
              label={saveAttendance.isPending ? "Kaydediliyor" : "Yoklamayı Kaydet"}
              onPress={submitAttendance}
            />
            {trainingStarted && !trainingCompleted ? (
              <Button
                variant="outline"
                disabled={completeTraining.isPending || !allAttendanceRecorded}
                label={completeTraining.isPending ? "Tamamlanıyor" : allAttendanceRecorded ? "Antrenmanı Bitir" : "Önce Yoklamayı Tamamla"}
                onPress={complete}
              />
            ) : null}
          </>
        )}
      </SurfaceCard>

      {trainingCompleted ? (
        <SurfaceCard style={styles.rosterCard}>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>Antrenman Raporları</Text>
            <Text style={styles.mutedText}>{athletes.filter((athlete) => athlete.status === "Present" && athlete.reportEntered).length}/{athletes.filter((athlete) => athlete.status === "Present").length}</Text>
          </View>
          {athletes.filter((athlete) => athlete.status === "Present").map((athlete) => (
            <View key={athlete.athleteProfileId} style={styles.reportRow}>
              <View style={styles.flexOne}>
                <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
                <Text style={styles.mutedText}>{athlete.reportEntered ? "Rapor girildi" : "Rapor bekliyor"}</Text>
              </View>
              <Button disabled={athlete.reportEntered} variant={athlete.reportEntered ? "outline" : "primary"} label={athlete.reportEntered ? "Rapor Girildi" : "Rapor Gir"} onPress={() => setReportAthlete(athlete)} />
            </View>
          ))}
          {athletes.every((athlete) => athlete.status !== "Present") ? <Text style={styles.mutedText}>Gelen oyuncu olmadığı için rapor beklenmiyor.</Text> : null}
        </SurfaceCard>
      ) : null}

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

      {reportAthlete ? <TrainingReportModal trainingId={trainingId} athlete={reportAthlete} visible onClose={() => setReportAthlete(null)} /> : null}
    </ScreenShell>
  );
}

const ATTENDANCE_OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "Present", label: "Geldi" },
  { status: "Absent", label: "Gelmedi" }
];

function AttendanceRow({ athlete, status, disabled = false, onChange }: {
  athlete: CoachAttendanceRosterItem;
  status: AttendanceStatus;
  disabled?: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceHeader}>
        <ProfileAvatar uri={athlete.profileImageUrl ? resolveApiUrl(athlete.profileImageUrl) : null} label={`${athlete.firstName[0]}${athlete.lastName[0]}`} size={38} tone="dark" />
        <View style={styles.flexOne}>
          <Text style={styles.athleteName}>{athlete.firstName} {athlete.lastName}</Text>
          <Text style={styles.athleteMeta}>Veli: {athlete.parentFullName}</Text>
        </View>
      </View>
      <View style={[styles.statusGroup, disabled && styles.statusGroupDisabled]}>
        {ATTENDANCE_OPTIONS.map((option) => {
          const selected = option.status === status;
          return (
            <Pressable
              key={option.status}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
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

const INITIAL_TRAINING_REPORT = {
  nutritionScore: "80",
  cognitiveDevelopmentScore: "80",
  disciplineScore: "80",
  physicalConditionScore: "80",
  psychologicalDevelopmentScore: "80",
  tacticalDevelopmentScore: "80",
  technicalDevelopmentScore: "80",
  coachNote: ""
};

function TrainingReportModal({ trainingId, athlete, visible, onClose }: {
  trainingId: string;
  athlete: CoachAttendanceRosterItem;
  visible: boolean;
  onClose: () => void;
}) {
  const saveReport = useSaveTrainingReport(trainingId, athlete.athleteProfileId);
  const [form, setForm] = useState(INITIAL_TRAINING_REPORT);

  function update(key: keyof typeof INITIAL_TRAINING_REPORT, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const scores = {
      nutritionScore: parsePercentage(form.nutritionScore),
      cognitiveDevelopmentScore: parsePercentage(form.cognitiveDevelopmentScore),
      disciplineScore: parsePercentage(form.disciplineScore),
      physicalConditionScore: parsePercentage(form.physicalConditionScore),
      psychologicalDevelopmentScore: parsePercentage(form.psychologicalDevelopmentScore),
      tacticalDevelopmentScore: parsePercentage(form.tacticalDevelopmentScore),
      technicalDevelopmentScore: parsePercentage(form.technicalDevelopmentScore)
    };
    if (Object.values(scores).some((score) => score === null)) {
      Alert.alert("Antrenman raporu", "Puanlar 0 ile 100 arasında tam sayı olmalı.");
      return;
    }

    const request: SaveTrainingReportRequest = {
      athleteProfileId: athlete.athleteProfileId,
      nutritionScore: scores.nutritionScore!,
      cognitiveDevelopmentScore: scores.cognitiveDevelopmentScore!,
      disciplineScore: scores.disciplineScore!,
      physicalConditionScore: scores.physicalConditionScore!,
      psychologicalDevelopmentScore: scores.psychologicalDevelopmentScore!,
      tacticalDevelopmentScore: scores.tacticalDevelopmentScore!,
      technicalDevelopmentScore: scores.technicalDevelopmentScore!,
      coachNote: form.coachNote.trim() || null
    };

    saveReport.mutate(request, {
      onSuccess: () => {
        Alert.alert("Antrenman raporu", "Rapor kaydedildi.");
        onClose();
      },
      onError: () => Alert.alert("Antrenman raporu", "Rapor kaydedilemedi. Lütfen tekrar deneyin.")
    });
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Antrenman Raporu</Text>
              <Text style={styles.mutedText}>{athlete.firstName} {athlete.lastName}</Text>
            </View>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.reportScoreGrid}>
              <TextField label="Beslenme" keyboardType="number-pad" value={form.nutritionScore} onChangeText={(value) => update("nutritionScore", value)} />
              <TextField label="Bilişsel gelişim" keyboardType="number-pad" value={form.cognitiveDevelopmentScore} onChangeText={(value) => update("cognitiveDevelopmentScore", value)} />
              <TextField label="Disiplin" keyboardType="number-pad" value={form.disciplineScore} onChangeText={(value) => update("disciplineScore", value)} />
              <TextField label="Fizik/kondisyon" keyboardType="number-pad" value={form.physicalConditionScore} onChangeText={(value) => update("physicalConditionScore", value)} />
              <TextField label="Psikolojik gelişim" keyboardType="number-pad" value={form.psychologicalDevelopmentScore} onChangeText={(value) => update("psychologicalDevelopmentScore", value)} />
              <TextField label="Taktik gelişim" keyboardType="number-pad" value={form.tacticalDevelopmentScore} onChangeText={(value) => update("tacticalDevelopmentScore", value)} />
              <TextField label="Teknik gelişim" keyboardType="number-pad" value={form.technicalDevelopmentScore} onChangeText={(value) => update("technicalDevelopmentScore", value)} />
            </View>
            <TextField label="Antrenör notu" multiline value={form.coachNote} onChangeText={(value) => update("coachNote", value)} placeholder="İsteğe bağlı kısa not" />
            <Button disabled={saveReport.isPending} label={saveReport.isPending ? "Kaydediliyor" : "Raporu Kaydet"} onPress={submit} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function parsePercentage(value: string) {
  const score = Number(value.replace(",", "."));
  return Number.isInteger(score) && score >= 0 && score <= 100 ? score : null;
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
  attendanceCount: { ...typography.display, color: colors.onSurface },
  attendanceNumbers: { flex: 1, gap: spacing.xs },
  attendanceSummary: { gap: spacing.md },
  attendanceSummaryContent: { alignItems: "center", flexDirection: "row", gap: spacing.lg },
  attendanceTotal: { ...typography.title, color: colors.onSurfaceVariant },
  athleteList: { gap: spacing.sm },
  athleteMeta: { ...typography.body, color: colors.onSurfaceVariant },
  athleteName: { ...typography.bodyLarge, color: colors.primary, fontFamily: "Inter_700Bold" },
  attendanceHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  attendanceRow: { backgroundColor: colors.surface, borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  backButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  bodyText: { ...typography.bodyLarge, color: colors.onSurface },
  card: { gap: spacing.md },
  checkbox: { alignItems: "center", borderColor: colors.outline, borderRadius: 6, borderWidth: 1, height: 24, justifyContent: "center", width: 24 },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  detailHeader: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  disabledAction: { opacity: 0.4 },
  editButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  eyebrow: { ...typography.label, color: colors.secondary, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  groupCount: { ...typography.body, color: colors.onSurfaceVariant },
  groupList: { gap: spacing.sm },
  groupNames: { ...typography.headline, color: colors.primary },
  groupOption: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  groupOptionActive: { backgroundColor: colors.surfaceContainerLow },
  groupOptionText: { ...typography.bodyLarge, color: colors.onSurface },
  groupOptionTextActive: { color: colors.primary, fontFamily: "Inter_700Bold" },
  groupPickerSection: { gap: spacing.xs },
  groupRow: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  groupSummary: { gap: spacing.sm },
  groupSummaryHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  groupSummaryTitle: { ...typography.title, color: colors.onSurface },
  headerCopy: { alignItems: "center", flex: 1, gap: spacing.xs },
  headingText: { ...typography.headline, color: colors.primary, textAlign: "center" },
  inputRow: { gap: spacing.md },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "88%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  mutedText: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  notesBox: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.sm, paddingTop: spacing.md },
  notesLabel: { ...typography.label, color: colors.onSurfaceVariant },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  primaryText: { ...typography.bodyLarge, color: colors.primary },
  rosterCard: { gap: spacing.md },
  rosterCount: { backgroundColor: colors.surfaceVariant, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  rosterCountText: { ...typography.label, color: colors.onSurfaceVariant },
  rosterHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rosterTitle: { ...typography.title, color: colors.onSurface },
  reportRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingTop: spacing.sm },
  reportScoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sectionLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  statusChip: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, flexGrow: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  statusChipSelected: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  statusChipText: { ...typography.label, color: colors.onSurfaceVariant },
  statusChipTextSelected: { color: colors.onPrimary },
  statusGroup: { flexDirection: "row", gap: spacing.xs },
  statusGroupDisabled: { opacity: 0.45 },
  summaryCard: { gap: spacing.lg },
  summaryIcon: { alignItems: "center", backgroundColor: "rgba(104,253,179,0.22)", borderRadius: radius.lg, height: 44, justifyContent: "center", width: 44 },
  summaryTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  trainingDate: { gap: spacing.xs },
  trainingDateFull: { ...typography.body, color: colors.onSurfaceVariant, textAlign: "right" },
  trainingDateLine: { alignItems: "baseline", flexDirection: "row", gap: spacing.xs },
  trainingDay: { color: colors.primary, fontFamily: "HankenGrotesk_800ExtraBold", fontSize: 44, lineHeight: 48 },
  trainingDivider: { backgroundColor: colors.outlineVariant, height: 1 },
  trainingLocation: { alignItems: "center", flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs },
  trainingMonth: { ...typography.title, color: colors.onSurfaceVariant },
  trainingStatus: { alignItems: "flex-end", gap: spacing.sm },
  trainingSummary: { gap: spacing.md },
  trainingSummaryTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  trainingTime: { ...typography.bodyLarge, color: colors.onSurface },
  trainingTimeLine: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  trainingTitle: { ...typography.headline, color: colors.onSurface },
  trainingTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  timeRow: { flexDirection: "row", gap: spacing.md },
  warningText: { ...typography.bodyLarge, color: colors.error }
});
