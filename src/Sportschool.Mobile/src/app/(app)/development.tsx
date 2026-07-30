import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { useCreateSchoolGroup, useSchoolGroups } from "@/features/coach/api";
import type { SchoolGroupResponse } from "@/features/coach/types";
import { useReports } from "@/features/me/api";
import type { AthleteReportResponse } from "@/features/me/types";
import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, InitialsAvatar, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
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
  const { selectedAthleteProfileId } = useAthleteSelection();
  const reportsQuery = useReports(!isCoach, selectedAthleteProfileId);
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

function DevelopmentReports({ session, reports }: { session: ReturnType<typeof useSession>["session"]; reports: AthleteReportResponse[] }) {
  const latest = reports[0];
  const previous = reports[1];
  const chartValues = reports.length > 0
    ? reports.slice(0, 6).reverse().map((report) => averageScore(report) * 10)
    : [40, 55, 45, 70, 60, 85];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "S"} size={38} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Gelişim</Text>
        <Text style={styles.subtitle}>Performans metrikleri, grafik ve antrenör yorumları.</Text>
      </View>

      {latest ? (
        <>
          <SurfaceCard style={styles.skillCard}>
            <SectionTitle title="Performans" action={previous ? "Önceki rapora göre" : undefined} />
            <View style={styles.skillList}>
              {scoreLabels.map(([label, key, icon]) => (
                <SkillRow
                  key={key}
                  icon={icon}
                  label={label}
                  value={latest[key]}
                  delta={previous ? round1(latest[key] - previous[key]) : null}
                />
              ))}
            </View>
          </SurfaceCard>

          {latest.improvementAreas ? (
            <SurfaceCard style={styles.focusCard}>
              <View style={styles.focusHeader}>
                <MaterialCommunityIcons name="target" size={22} color={colors.secondary} />
                <Text style={styles.sectionHeading}>Gelişim Alanı</Text>
              </View>
              <Text style={styles.focusText}>{latest.improvementAreas}</Text>
            </SurfaceCard>
          ) : null}

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
        </>
      ) : (
        <SurfaceCard>
          <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
        </SurfaceCard>
      )}
    </ScreenShell>
  );
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

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.rowMeta}>{label}</Text>
    </View>
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

function averageScore(report: AthleteReportResponse) {
  return (report.speedScore + report.strengthScore + report.dribblingScore + report.shootingScore) / 4;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

const styles = StyleSheet.create({
  chartCard: { gap: spacing.md },
  commentCard: { gap: spacing.md },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  commentItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  contactButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.lg },
  date: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  flexOne: { flex: 1 },
  groupCard: { backgroundColor: colors.surfaceContainerLowest, justifyContent: "center", minHeight: 82 },
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
  legendDot: { borderRadius: 4, height: 8, width: 8 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
  list: { gap: spacing.md },
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
  sectionHeading: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summary: { ...typography.bodyLarge, color: colors.onSurface },
  title: { ...typography.headline, color: colors.onSurface, flex: 1 }
});
