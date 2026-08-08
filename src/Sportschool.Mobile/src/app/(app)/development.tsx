import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useCreateSchoolGroup, useSchoolGroups } from "@/features/coach/api";
import type { SchoolGroupResponse } from "@/features/coach/types";
import { useDevelopmentSummary } from "@/features/me/api";
import { ParentAthleteSelector, SelectedAthleteAvatar } from "@/features/me/ParentAthleteSelector";
import type { DevelopmentMetricAverages, DevelopmentSummaryResponse, TrainingReportResponse } from "@/features/me/types";
import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

const scoreLabels = [
  ["Beslenme", "nutrition", "food-apple-outline"],
  ["Bilişsel gelişim", "cognitiveDevelopment", "brain"],
  ["Disiplin", "discipline", "clipboard-check-outline"],
  ["Fizik/kondisyon", "physicalCondition", "run-fast"],
  ["Psikolojik gelişim", "psychologicalDevelopment", "head-heart-outline"],
  ["Taktik gelişim", "tacticalDevelopment", "chess-knight"],
  ["Teknik gelişim", "technicalDevelopment", "soccer"]
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
  const isCoach = session?.loginRole === "Coach" || session?.loginRole === "SchoolAdmin";
  const { selectedAthleteProfileId } = useAthleteSelection();
  const summaryQuery = useDevelopmentSummary(!isCoach, selectedAthleteProfileId);
  const schoolGroupsQuery = useSchoolGroups(isCoach);

  if (isCoach && schoolGroupsQuery.isLoading) {
    return <LoadingState label="Gruplar yükleniyor" />;
  }

  if (!isCoach && summaryQuery.isLoading) {
    return <LoadingState label="Raporlar yükleniyor" />;
  }

  if (isCoach) {
    return <CoachTeams session={session} groups={schoolGroupsQuery.data ?? []} />;
  }

  return <DevelopmentReports session={session} summary={summaryQuery.data} />;
}

function CoachTeams({
  session,
  groups
}: {
  session: ReturnType<typeof useSession>["session"];
  groups: SchoolGroupResponse[];
}) {
  const createGroup = useCreateSchoolGroup();
  const [form, setForm] = useState(emptyGroupForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const isSaving = createGroup.isPending;

  function openCreateForm() {
    setForm(emptyGroupForm);
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

    createGroup.mutate(request, {
      onSuccess: (newGroup) => {
        setIsFormVisible(false);
        Alert.alert("Gruplar", "Grup eklendi.");
        router.push(`/groups/${newGroup.id}`);
      },
      onError: () => Alert.alert("Gruplar", "Grup eklenemedi.")
    });
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Sporcu Gruplarım</Text>
        <Pressable onPress={openCreateForm} style={styles.primaryButton}>
          <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Yeni Grup Ekle</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {groups.length === 0 ? (
          <SurfaceCard>
            <EmptyState title="Grup yok" description="Henüz aktif grup bulunmuyor." />
          </SurfaceCard>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
            />
          ))
        )}
      </View>
      <GroupFormModal
        form={form}
        saving={isSaving}
        visible={isFormVisible}
        onChangeForm={(patch) => setForm((current) => ({ ...current, ...patch }))}
        onClose={() => setIsFormVisible(false)}
        onSubmit={submitGroup}
      />
    </ScreenShell>
  );
}

function DevelopmentReports({ session, summary }: { session: ReturnType<typeof useSession>["session"]; summary?: DevelopmentSummaryResponse }) {
  const reports = summary?.reports ?? [];
  const averages = summary?.averages;

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<SelectedAthleteAvatar />}>
      <ParentAthleteSelector />
      <View style={styles.memberHeader}>
        <Text style={styles.title}>Gelişimim</Text>
        <Text style={styles.subtitle}>Antrenmanlardaki performansını ve antrenör değerlendirmelerini takip et.</Text>
      </View>

      {averages ? (
        <>
          <SurfaceCard style={styles.performanceHero}>
            <Text style={styles.performanceKicker}>GENEL PERFORMANS</Text>
            <Text style={styles.performanceScore}>{averageMetrics(averages).toFixed(0)}</Text>
            <Text style={styles.performanceCaption}>Son raporlarının ortalama puanı</Text>
            <View style={styles.performanceStats}>
              <PerformanceStat icon="file-chart-outline" label="Rapor" value={`${reports.length}`} />
              <View style={styles.performanceDivider} />
              <PerformanceStat
                icon="calendar-check-outline"
                label="Katılım"
                value={summary?.attendanceRate === null || summary?.attendanceRate === undefined ? "-" : `%${summary.attendanceRate}`}
              />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.skillCard}>
            <SectionTitle title="Gelişim Alanlarım" action="7 metrik" />
            <View style={styles.skillList}>
              {scoreLabels.map(([label, key, icon]) => (
                <SkillRow
                  key={key}
                  icon={icon}
                  label={label}
                  value={averages[key]}
                  delta={null}
                />
              ))}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionHeading}>Raporlarım</Text>
              <Text style={styles.reportCount}>{reports.length} rapor</Text>
            </View>
            {reports.map((report) => <ReportRow key={report.id} report={report} />)}
          </SurfaceCard>
        </>
      ) : (
        <SurfaceCard>
          <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
        </SurfaceCard>
      )}
    </ScreenShell>
  );
}

function PerformanceStat({ icon, label, value }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.performanceStat}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.primaryFixed} />
      <Text style={styles.performanceStatValue}>{value}</Text>
      <Text style={styles.performanceStatLabel}>{label}</Text>
    </View>
  );
}

function ReportRow({ report }: { report: TrainingReportResponse }) {
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/reports/[trainingId]/member", params: { trainingId: report.trainingSessionId } })}
      style={({ pressed }) => [styles.reportRow, pressed && styles.reportRowPressed]}
    >
      <View style={styles.reportDateBadge}>
        <MaterialCommunityIcons name="file-chart-outline" size={20} color={colors.primaryContainer} />
      </View>
      <View style={styles.flexOne}>
        <Text style={styles.date}>{formatDate(report.trainingCompletedAt)}</Text>
        <Text style={styles.summary}>{report.trainingTitle}</Text>
        <Text numberOfLines={1} style={styles.improvement}>{report.coachNote?.trim() || "Antrenör değerlendirmesini görüntüle."}</Text>
      </View>
      <View style={styles.reportScore}>
        <Text style={styles.reportScoreValue}>{reportAverage(report).toFixed(0)}</Text>
        <Text style={styles.reportScoreLabel}>PUAN</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.outline} />
    </Pressable>
  );
}

function averageMetrics(averages: DevelopmentMetricAverages) {
  return (averages.nutrition
    + averages.cognitiveDevelopment
    + averages.discipline
    + averages.physicalCondition
    + averages.psychologicalDevelopment
    + averages.tacticalDevelopment
    + averages.technicalDevelopment) / 7;
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

function GroupCard({ group }: { group: SchoolGroupResponse }) {
  return (
    <Pressable onPress={() => router.push(`/groups/${group.id}`)}>
      <SurfaceCard style={styles.groupCard}>
        <View style={styles.groupCardMain}>
          <View style={styles.groupIconWrap}>
            <AcademyLogoAvatar size={42} />
          </View>
          <View style={styles.groupCopy}>
            <Text style={styles.groupTitle}>{group.name}</Text>
            {group.description?.trim() ? (
              <Text style={styles.groupDesc} numberOfLines={2}>{group.description}</Text>
            ) : null}
          </View>
          <View style={styles.groupAction}>
            <MaterialCommunityIcons name="chevron-right" size={26} color={colors.outline} />
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

function GroupFormModal({ form, saving, visible, onChangeForm, onClose, onSubmit }: {
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
            <Text style={styles.modalTitle}>Yeni Grup</Text>
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

function SkillRow({ icon, label, value, delta }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: number; delta: number | null }) {
  const up = delta !== null && delta > 0;
  const down = delta !== null && delta < 0;
  const deltaColor = up ? colors.secondary : down ? colors.error : colors.outline;
  return (
    <View style={styles.skillRow}>
      <View style={styles.skillIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.skillLabel}>{label}</Text>
      <Text style={styles.skillValue}>{value.toFixed(1)}</Text>
      {delta === null || delta === 0 ? (
        <Text style={styles.skillFlat}>{delta === 0 ? "—" : ""}</Text>
      ) : (
        <View style={styles.skillDelta}>
          <MaterialCommunityIcons name={up ? "arrow-up" : "arrow-down"} size={14} color={deltaColor} />
          <Text style={[styles.skillDeltaText, { color: deltaColor }]}>{Math.abs(delta).toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  commentCard: { gap: spacing.md },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  contactButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  date: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  groupCard: { justifyContent: "center", minHeight: 82 },
  groupAction: { alignItems: "center", height: 50, justifyContent: "center", width: 50 },
  groupCardMain: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  groupCopy: { alignItems: "center", flex: 1 },
  groupDesc: { ...typography.body, color: colors.primaryContainer, marginTop: spacing.xs, textAlign: "center" },
  groupIconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  groupTitle: { ...typography.headline, color: colors.onSurface, fontSize: 27, lineHeight: 32, textAlign: "center" },
  headerBlock: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  iconAction: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  improvement: { ...typography.body, color: colors.onSurfaceVariant },
  list: { gap: spacing.md },
  memberHeader: { gap: spacing.xs },
  performanceCaption: { ...typography.body, color: colors.onSurfaceVariant },
  performanceDivider: { backgroundColor: colors.outlineVariant, height: 44, width: 1 },
  performanceHero: { alignItems: "center", backgroundColor: colors.surfaceContainerHighest, gap: spacing.xs, paddingVertical: spacing.lg },
  performanceKicker: { ...typography.label, color: colors.primaryFixed, letterSpacing: 1.1 },
  performanceScore: { ...typography.display, color: colors.primaryContainer, fontSize: 56, lineHeight: 62 },
  performanceStat: { alignItems: "center", flex: 1, gap: 2 },
  performanceStatLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  performanceStatValue: { ...typography.headline, color: colors.onSurface },
  performanceStats: { alignSelf: "stretch", flexDirection: "row", marginTop: spacing.md },
  skillCard: { gap: spacing.md },
  skillList: { gap: spacing.sm },
  skillRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  skillIcon: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, height: 36, justifyContent: "center", width: 36 },
  skillLabel: { ...typography.bodyLarge, color: colors.onSurface, flex: 1 },
  skillValue: { ...typography.title, color: colors.primary },
  skillDelta: { alignItems: "center", flexDirection: "row", gap: 2, minWidth: 48, justifyContent: "flex-end" },
  skillDeltaText: { ...typography.label },
  skillFlat: { ...typography.label, color: colors.outline, minWidth: 48, textAlign: "right" },
  focusCard: { backgroundColor: colors.secondaryContainer, gap: spacing.sm },
  focusHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  focusText: { ...typography.bodyLarge, color: colors.onSurface },
  modalBackdrop: { backgroundColor: "rgba(0, 0, 0, 0.32)", flex: 1, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "80%", padding: spacing.lg },
  modalContent: { gap: spacing.md, paddingBottom: spacing.xl },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  modalTitle: { ...typography.headline, color: colors.primary },
  primaryButton: { alignItems: "center", backgroundColor: colors.primaryContainer, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  primaryButtonText: { ...typography.label, color: colors.onPrimary },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  reportCount: { ...typography.label, color: colors.primaryContainer },
  reportDateBadge: { alignItems: "center", backgroundColor: colors.surfaceContainerHigh, borderRadius: radius.md, height: 42, justifyContent: "center", width: 42 },
  reportRow: { alignItems: "center", borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  reportRowPressed: { opacity: 0.72 },
  reportScore: { alignItems: "center", minWidth: 38 },
  reportScoreLabel: { ...typography.label, color: colors.onSurfaceVariant, fontSize: 9 },
  reportScoreValue: { ...typography.title, color: colors.primaryContainer },
  sectionHeading: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summary: { ...typography.bodyLarge, color: colors.onSurface },
  title: { ...typography.headline, color: colors.onSurface, flex: 1 }
});
