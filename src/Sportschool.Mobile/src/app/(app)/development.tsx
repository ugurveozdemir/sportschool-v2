import { StyleSheet, Text, View } from "react-native";

import { useReports } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate } from "@/shared/utils/date";

const scoreLabels = [
  ["Hız", "speedScore"],
  ["Güç", "strengthScore"],
  ["Dribling", "dribblingScore"],
  ["Şut", "shootingScore"]
] as const;

export default function DevelopmentScreen() {
  const reportsQuery = useReports();

  if (reportsQuery.isLoading) {
    return <LoadingState label="Raporlar yükleniyor" />;
  }

  const reports = reportsQuery.data ?? [];

  return (
    <AppScreen>
      <Text style={styles.title}>Gelişim</Text>
      <Text style={styles.subtitle}>Antrenörlerin tarafından paylaşılan performans raporları.</Text>

      <View style={styles.list}>
        {reports.length === 0 ? (
          <Card>
            <EmptyState title="Rapor yok" description="Henüz yayınlanmış gelişim raporu bulunmuyor." />
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} style={styles.reportCard}>
              <Text style={styles.date}>{formatDate(report.createdAt)}</Text>
              <Text style={styles.summary}>{report.summary}</Text>
              <Text style={styles.improvement}>Gelişim alanı: {report.improvementAreas}</Text>
              <View style={styles.scores}>
                {scoreLabels.map(([label, key]) => (
                  <View key={key} style={styles.scoreBox}>
                    <Text style={styles.scoreValue}>{report[key].toFixed(1)}</Text>
                    <Text style={styles.scoreLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  date: { ...typography.label, color: colors.secondary, textTransform: "uppercase" },
  improvement: { ...typography.body, color: colors.onSurfaceVariant },
  list: { gap: spacing.md, marginTop: spacing.lg },
  reportCard: { gap: spacing.md },
  scoreBox: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.md, flex: 1, padding: spacing.sm },
  scoreLabel: { ...typography.label, color: colors.onSurfaceVariant },
  scoreValue: { ...typography.title, color: colors.primary },
  scores: { flexDirection: "row", gap: spacing.sm },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summary: { ...typography.title, color: colors.primary },
  title: { ...typography.display, color: colors.primary }
});
