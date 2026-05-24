import { StyleSheet, Text, View } from "react-native";

import { usePayments } from "@/features/me/api";
import { AppScreen } from "@/shared/components/AppScreen";
import { Badge } from "@/shared/components/Badge";
import { Card } from "@/shared/components/Card";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { formatMonth } from "@/shared/utils/date";
import { formatMoney } from "@/shared/utils/money";
import { getPaymentLabel } from "@/shared/utils/status";

export default function PaymentsScreen() {
  const paymentsQuery = usePayments();

  if (paymentsQuery.isLoading) {
    return <LoadingState label="Ödemeler yükleniyor" />;
  }

  const payments = paymentsQuery.data ?? [];
  const currentPayment = payments[0];

  return (
    <AppScreen>
      <Text style={styles.title}>Ödemeler</Text>
      <Text style={styles.subtitle}>Aidat ve ödeme geçmişini takip et.</Text>

      {currentPayment ? (
        <Card style={styles.currentCard}>
          <View>
            <Text style={styles.label}>Güncel durum</Text>
            <Text style={styles.currentTitle}>{formatMonth(currentPayment.year, currentPayment.month)}</Text>
          </View>
          <View style={styles.currentRight}>
            <Text style={styles.amount}>{formatMoney(currentPayment.balance)}</Text>
            <Badge label={getPaymentLabel(currentPayment.effectiveStatus)} tone={currentPayment.effectiveStatus === "Paid" ? "success" : "danger"} />
          </View>
        </Card>
      ) : null}

      <View style={styles.list}>
        {payments.length === 0 ? (
          <Card>
            <EmptyState title="Ödeme kaydı yok" description="Henüz ödeme kaydı bulunmuyor." />
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{formatMonth(payment.year, payment.month)}</Text>
                <Text style={styles.rowSubtitle}>Ödenen {formatMoney(payment.amountPaid)} / {formatMoney(payment.amount)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{formatMoney(payment.balance)}</Text>
                <Badge label={getPaymentLabel(payment.effectiveStatus)} tone={payment.effectiveStatus === "Paid" ? "success" : "danger"} />
              </View>
            </Card>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  amount: { ...typography.headline, color: colors.primary },
  currentCard: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  currentRight: { alignItems: "flex-end", gap: spacing.xs },
  currentTitle: { ...typography.title, color: colors.primary },
  label: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  list: { gap: spacing.md, marginTop: spacing.lg },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  rowAmount: { ...typography.title, color: colors.primary },
  rowRight: { alignItems: "flex-end", gap: spacing.xs },
  rowSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  title: { ...typography.display, color: colors.primary }
});
