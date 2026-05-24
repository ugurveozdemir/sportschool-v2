import { StyleSheet, Text, View } from "react-native";

import { useGroups, useTrainings } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatDate, formatTime } from "@/shared/utils/date";

export default function CalendarScreen() {
  const trainingsQuery = useTrainings();
  const groupsQuery = useGroups();

  if (trainingsQuery.isLoading) {
    return <LoadingState label="Antrenmanlar yükleniyor" />;
  }

  const trainings = trainingsQuery.data ?? [];

  return (
    <AppScreen>
      <Text style={styles.title}>Antrenman Programı</Text>
      <Text style={styles.subtitle}>Grubuna atanmış aktif antrenmanlar.</Text>

      <View style={styles.list}>
        {trainings.length === 0 ? (
          <Card>
            <EmptyState title="Program boş" description="Şu anda görüntülenecek antrenman bulunmuyor." />
          </Card>
        ) : (
          trainings.map((training) => {
            const groupName = groupsQuery.data?.find((group) => group.id === training.groupId)?.name ?? "Grup";
            return (
              <Card key={training.id} style={styles.trainingCard}>
                <View style={styles.datePill}>
                  <Text style={styles.datePillDay}>{new Date(training.startsAt).getDate()}</Text>
                  <Text style={styles.datePillMonth}>{new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(new Date(training.startsAt))}</Text>
                </View>
                <View style={styles.trainingText}>
                  <Text style={styles.trainingTitle}>{training.title}</Text>
                  <Text style={styles.trainingMeta}>{formatDate(training.startsAt)} • {formatTime(training.startsAt)} - {formatTime(training.endsAt)}</Text>
                  <Text style={styles.trainingMeta}>{groupName} • {training.location ?? "Lokasyon yok"}</Text>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  datePill: { alignItems: "center", backgroundColor: colors.secondaryContainer, borderRadius: radius.md, padding: spacing.sm, width: 58 },
  datePillDay: { ...typography.title, color: colors.primary },
  datePillMonth: { ...typography.label, color: colors.onSecondaryContainer, textTransform: "uppercase" },
  list: { gap: spacing.md, marginTop: spacing.lg },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  title: { ...typography.display, color: colors.primary },
  trainingCard: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  trainingMeta: { ...typography.body, color: colors.onSurfaceVariant },
  trainingText: { flex: 1, gap: 3 },
  trainingTitle: { ...typography.title, color: colors.primary }
});
