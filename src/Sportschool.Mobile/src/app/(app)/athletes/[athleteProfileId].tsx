import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useCoachAthlete, useCreateCoachAthleteReport } from "@/features/coach/api";
import type { SaveCoachAthleteReportRequest } from "@/features/coach/types";
import type { AthleteReportResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { LoadingState } from "@/shared/components/LoadingState";
import { BarChart, CircularScore, InitialsAvatar, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatDate } from "@/shared/utils/date";

const initialForm = {
  summary: "",
  improvementAreas: "",
  speedScore: "8",
  strengthScore: "8",
  dribblingScore: "8",
  shootingScore: "8"
};

export default function CoachAthleteDetailScreen() {
  const { session } = useSession();
  const { athleteProfileId } = useLocalSearchParams<{ athleteProfileId: string }>();
  const athleteQuery = useCoachAthlete(athleteProfileId);
  const createReport = useCreateCoachAthleteReport(athleteProfileId);
  const [form, setForm] = useState(initialForm);

  if (athleteQuery.isLoading) {
    return <LoadingState label="Sporcu bilgileri yükleniyor" />;
  }

  const athlete = athleteQuery.data;
  if (!athlete) {
    return (
      <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
        <SurfaceCard style={styles.emptyCard}>
          <Text style={styles.title}>Sporcu bulunamadı</Text>
          <Text style={styles.subtitle}>Bu sporcu sana atanmış aktif gruplarda görünmüyor.</Text>
          <Button label="Geri Dön" variant="outline" onPress={() => router.back()} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const name = `${athlete.firstName} ${athlete.lastName}`;
  const currentAthleteId = athlete.athleteProfileId;
  const latestReport = athlete.reports[0];
  const chartValues = athlete.reports.length > 0
    ? athlete.reports.slice(0, 6).reverse().map((report) => averageScore(report) * 10)
    : [35, 48, 55, 64, 70, 78];

  function updateForm(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitReport() {
    const request = buildRequest(currentAthleteId, form);
    if (!request) {
      Alert.alert("Gelişim raporu", "Skorlar 0-10 arasında ve 0.5 adımlarla olmalı. Özet ve gelişim alanı boş bırakılamaz.");
      return;
    }

    createReport.mutate(request, {
      onSuccess: () => {
        setForm(initialForm);
        Alert.alert("Gelişim raporu", "Rapor kaydedildi.");
      },
      onError: () => Alert.alert("Gelişim raporu", "Rapor kaydedilemedi.")
    });
  }

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.detailHeader}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.primary} />
        </Pressable>
        <View style={styles.identity}>
          <InitialsAvatar label={initials(name)} size={108} tone="dark" />
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.subtitle}>{athlete.groups.join(", ") || "Grup ataması yok"}</Text>
          <View style={styles.pillRow}>
            <Pill label={`Doğum: ${formatDate(athlete.birthDate)}`} tone="neutral" />
            {latestReport ? <Pill label={`${averageScore(latestReport).toFixed(1)} son skor`} tone="success" /> : <Pill label="Rapor yok" tone="warning" />}
          </View>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <CircularScore value={scorePercent(latestReport?.speedScore)} label="Hız" />
        <CircularScore value={scorePercent(latestReport?.dribblingScore)} label="Teknik" />
        <CircularScore value={scorePercent(latestReport?.strengthScore)} label="Güç" color={colors.primary} />
      </View>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Veli Bilgileri" />
        <Info label="Veli" value={athlete.parentFullName} />
        <Info label="Telefon" value={athlete.parentPhone} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Gelişim Grafiği" action={athlete.reports.length > 0 ? "Son 6 Rapor" : "Örnek"} />
        <BarChart values={chartValues} />
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Son Raporlar" />
        {athlete.reports.length === 0 ? <Text style={styles.muted}>Henüz rapor girilmemiş.</Text> : null}
        {athlete.reports.slice(0, 3).map((report) => (
          <View key={report.id} style={styles.reportItem}>
            <Text style={styles.reportDate}>{formatDate(report.createdAt)}</Text>
            <Text style={styles.reportSummary}>{report.summary}</Text>
            <Text style={styles.muted}>Gelişim alanı: {report.improvementAreas}</Text>
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <SectionTitle title="Yeni Gelişim Raporu" />
        <TextField label="Özet" multiline value={form.summary} onChangeText={(value) => updateForm("summary", value)} placeholder="Bugünkü performans özeti" />
        <TextField label="Gelişim Alanları" multiline value={form.improvementAreas} onChangeText={(value) => updateForm("improvementAreas", value)} placeholder="Odaklanılacak teknik/taktik alanlar" />
        <View style={styles.scoreGrid}>
          <TextField label="Hız" keyboardType="decimal-pad" value={form.speedScore} onChangeText={(value) => updateForm("speedScore", value)} />
          <TextField label="Güç" keyboardType="decimal-pad" value={form.strengthScore} onChangeText={(value) => updateForm("strengthScore", value)} />
          <TextField label="Dribling" keyboardType="decimal-pad" value={form.dribblingScore} onChangeText={(value) => updateForm("dribblingScore", value)} />
          <TextField label="Şut" keyboardType="decimal-pad" value={form.shootingScore} onChangeText={(value) => updateForm("shootingScore", value)} />
        </View>
        <Button disabled={createReport.isPending} label={createReport.isPending ? "Kaydediliyor" : "Raporu Kaydet"} onPress={submitReport} />
      </SurfaceCard>
    </ScreenShell>
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

function buildRequest(athleteProfileId: string, form: typeof initialForm): SaveCoachAthleteReportRequest | null {
  const scores = {
    speedScore: parseScore(form.speedScore),
    strengthScore: parseScore(form.strengthScore),
    dribblingScore: parseScore(form.dribblingScore),
    shootingScore: parseScore(form.shootingScore)
  };

  if (!form.summary.trim() || !form.improvementAreas.trim() || Object.values(scores).some((score) => score === null)) {
    return null;
  }

  return {
    athleteProfileId,
    summary: form.summary.trim(),
    improvementAreas: form.improvementAreas.trim(),
    speedScore: scores.speedScore!,
    strengthScore: scores.strengthScore!,
    dribblingScore: scores.dribblingScore!,
    shootingScore: scores.shootingScore!
  };
}

function parseScore(value: string) {
  const score = Number(value.replace(",", "."));
  return Number.isFinite(score) && score >= 0 && score <= 10 && Number.isInteger(score * 2) ? score : null;
}

function averageScore(report: AthleteReportResponse) {
  return (report.speedScore + report.strengthScore + report.dribblingScore + report.shootingScore) / 4;
}

function scorePercent(score?: number) {
  return Math.round((score ?? 0) * 10);
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  backButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 44, justifyContent: "center", width: 44 },
  card: { gap: spacing.md },
  detailHeader: { gap: spacing.md },
  emptyCard: { gap: spacing.md },
  identity: { alignItems: "center", gap: spacing.sm },
  infoLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  infoRow: { borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, gap: spacing.xs, paddingVertical: spacing.sm },
  infoValue: { ...typography.bodyLarge, color: colors.onSurface },
  metricsGrid: { flexDirection: "row", gap: spacing.sm, justifyContent: "space-around" },
  muted: { ...typography.body, color: colors.onSurfaceVariant },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  reportDate: { ...typography.label, color: colors.outline, textTransform: "uppercase" },
  reportItem: { borderLeftColor: colors.primary, borderLeftWidth: 2, gap: spacing.xs, paddingLeft: spacing.md },
  reportSummary: { ...typography.bodyLarge, color: colors.onSurface },
  scoreGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.headline, color: colors.primary, textAlign: "center" }
});
