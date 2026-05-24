import { StyleSheet, Text, View } from "react-native";

import { useAttendance, useTrainings } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Badge } from "@/shared/components/Badge";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate, formatTime } from "@/shared/utils/date";
import { getAttendanceLabel } from "@/shared/utils/status";

export default function AttendanceScreen() {
  const attendanceQuery = useAttendance();
  const trainingsQuery = useTrainings();

  if (attendanceQuery.isLoading) {
    return <LoadingState label="Yoklama kayıtları yükleniyor" />;
  }

  const records = attendanceQuery.data ?? [];

  return (
    <AppScreen>
      <Text style={styles.title}>Yoklama</Text>
      <Text style={styles.subtitle}>Antrenman katılım geçmişin.</Text>

      <View style={styles.list}>
        {records.length === 0 ? (
          <Card>
            <EmptyState title="Kayıt yok" description="Henüz yoklama kaydı bulunmuyor." />
          </Card>
        ) : (
          records.map((record) => {
            const training = trainingsQuery.data?.find((item) => item.id === record.trainingSessionId);
            const tone = record.status === "Present" ? "success" : record.status === "Late" || record.status === "Excused" ? "warning" : "danger";
            return (
              <Card key={record.id} style={styles.row}>
                <View style={styles.textWrap}>
                  <Text style={styles.rowTitle}>{training?.title ?? "Antrenman"}</Text>
                  <Text style={styles.rowMeta}>{training ? `${formatDate(training.startsAt)} • ${formatTime(training.startsAt)}` : formatDate(record.recordedAt)}</Text>
                </View>
                <Badge label={getAttendanceLabel(record.status)} tone={tone} />
              </Card>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, marginTop: spacing.lg },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  textWrap: { flex: 1, gap: 2, paddingRight: spacing.md },
  title: { ...typography.display, color: colors.primary }
});
