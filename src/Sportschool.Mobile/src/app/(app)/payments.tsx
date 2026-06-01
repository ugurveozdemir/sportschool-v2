import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { usePayments } from "@/features/me/api";
import type { PaymentResponse } from "@/features/me/types";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatMonth } from "@/shared/utils/date";
import { formatMoney } from "@/shared/utils/money";
import { getPaymentLabel } from "@/shared/utils/status";

const coachPaymentRows = [
  { initials: "EA", name: "Efe Aslan", team: "U15", status: "Ödendi", amount: 1500, paid: true },
  { initials: "KY", name: "Kerem Yılmaz", team: "U17", status: "Gecikti", amount: 1500, paid: false },
  { initials: "BK", name: "Burak Kaya", team: "U15", status: "Ödendi", amount: 1500, paid: true }
];

export default function PaymentsScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const { selectedAthleteProfileId } = useAthleteSelection();
  const paymentsQuery = usePayments(!isCoach, selectedAthleteProfileId);

  if (!isCoach && paymentsQuery.isLoading) {
    return <LoadingState label="Ödemeler yükleniyor" />;
  }

  if (isCoach) {
    return <CoachPayments session={session} />;
  }

  return <MemberPayments session={session} payments={paymentsQuery.data ?? []} />;
}

function CoachPayments({ session }: { session: ReturnType<typeof useSession>["session"] }) {
  const collected = coachPaymentRows.filter((row) => row.paid).reduce((sum, row) => sum + row.amount, 0);
  const pending = coachPaymentRows.filter((row) => !row.paid).reduce((sum, row) => sum + row.amount, 0);

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerBlock}>
        <View>
          <Text style={styles.title}>Ödeme Takibi</Text>
          <Text style={styles.subtitle}>Bu ayın aidat durumlarını takip et.</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton}>
            <MaterialCommunityIcons name="download-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Rapor Al</Text>
          </Pressable>
          <Pressable style={styles.primaryButton}>
            <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Yeni Ödeme</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile icon="wallet-outline" label="Tahsilat" value={formatMoney(collected)} tone="success" />
        <MetricTile icon="clock-alert-outline" label="Bekleyen" value={formatMoney(pending)} tone="danger" />
      </View>

      <SurfaceCard style={styles.reminderCard}>
        <MaterialCommunityIcons name="bell-ring-outline" size={32} color={colors.onPrimaryContainer} />
        <Text style={styles.reminderTitle}>Gecikenlere Hatırlatma Gönder</Text>
        <Text style={styles.reminderMeta}>1 veliye SMS ilet</Text>
      </SurfaceCard>

      <View style={styles.filterRow}>
        <Pill label="Tümü" tone="primary" icon="check" />
        <Pill label="Ödendi" tone="success" />
        <Pill label="Geciken" tone="danger" icon="alert-circle-outline" />
      </View>

      <SurfaceCard style={styles.tableCard}>
        {coachPaymentRows.map((row) => (
          <PaymentPersonRow key={row.name} {...row} />
        ))}
      </SurfaceCard>
    </ScreenShell>
  );
}

function MemberPayments({ session, payments }: { session: ReturnType<typeof useSession>["session"]; payments: PaymentResponse[] }) {
  const unpaid = payments.filter((payment) => payment.effectiveStatus !== "Paid");
  const paid = payments.filter((payment) => payment.effectiveStatus === "Paid");
  const totalDue = unpaid.reduce((sum, payment) => sum + payment.balance, 0);
  const totalPaid = paid.reduce((sum, payment) => sum + payment.amountPaid, 0);
  const nextPayment = unpaid[0] ?? payments[0];

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)} avatar={<InitialsAvatar label={session?.fullName?.slice(0, 1) ?? "A"} size={42} tone="dark" />}>
      <View style={styles.headerBlock}>
        <View>
          <Text style={styles.title}>Ödemeler ve Aidat</Text>
          <Text style={styles.subtitle}>Finansal durumunu takip et.</Text>
        </View>
        <Pressable style={styles.primaryButton}>
          <MaterialCommunityIcons name="credit-card-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>Hemen Öde</Text>
        </Pressable>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryCard icon="alert-outline" label="Toplam Borç" value={formatMoney(totalDue)} tone="danger" badge={totalDue > 0 ? "Bekliyor" : "Yok"} />
        <SummaryCard icon="calendar-clock" label="Sıradaki Ödeme" value={nextPayment ? formatMoney(nextPayment.balance || nextPayment.amount) : formatMoney(0)} tone="primary" badge={nextPayment ? formatMonth(nextPayment.year, nextPayment.month) : "-"} />
        <SummaryCard icon="check-circle-outline" label="Toplam Ödenen" value={formatMoney(totalPaid)} tone="success" badge="Bu yıl" />
      </View>

      {payments.length === 0 ? (
        <SurfaceCard>
          <EmptyState title="Ödeme kaydı yok" description="Henüz ödeme kaydı bulunmuyor." />
        </SurfaceCard>
      ) : (
        <>
          <SectionTitle title="Bekleyen & Gelecek Ödemeler" />
          <View style={styles.list}>
            {unpaid.length === 0 ? (
              <SurfaceCard>
                <Text style={styles.rowTitle}>Bekleyen ödeme yok</Text>
                <Text style={styles.rowSubtitle}>Tüm aidatlar ödenmiş görünüyor.</Text>
              </SurfaceCard>
            ) : (
              unpaid.map((payment) => <MemberPaymentRow key={payment.id} payment={payment} />)
            )}
          </View>

          <SectionTitle title="Geçmiş Ödemeler" action="Tümünü Gör" />
          <View style={styles.list}>
            {paid.map((payment) => <MemberPaymentRow key={payment.id} payment={payment} />)}
          </View>
        </>
      )}
    </ScreenShell>
  );
}

function SummaryCard({ icon, label, value, tone, badge }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone: "primary" | "success" | "danger"; badge: string }) {
  const color = tone === "success" ? colors.secondary : tone === "danger" ? colors.error : colors.primary;
  return (
    <SurfaceCard style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={[styles.summaryIcon, { backgroundColor: tone === "danger" ? colors.errorContainer : colors.surfaceContainerHigh }]}> 
          <MaterialCommunityIcons name={icon} size={22} color={color} />
        </View>
        <Pill label={badge} tone={tone === "danger" ? "danger" : tone === "success" ? "success" : "neutral"} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </SurfaceCard>
  );
}

function MemberPaymentRow({ payment }: { payment: PaymentResponse }) {
  const paid = payment.effectiveStatus === "Paid";
  return (
    <SurfaceCard style={styles.paymentRow} accent={paid ? "secondary" : "error"}>
      <View style={styles.rowLead}>
        <InitialsAvatar label={paid ? "M" : "A"} tone={paid ? "green" : "red"} />
        <View style={styles.flexOne}>
          <Text style={styles.rowTitle}>{formatMonth(payment.year, payment.month)} Aidatı</Text>
          <Text style={[styles.rowSubtitle, !paid && styles.errorText]}>{paid ? `Ödendi: ${payment.paidOn ? new Date(payment.paidOn).toLocaleDateString("tr-TR") : "Kayıtlı"}` : `Kalan: ${formatMoney(payment.balance)}`}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{formatMoney(paid ? payment.amountPaid : payment.balance)}</Text>
        <Pill label={getPaymentLabel(payment.effectiveStatus)} tone={paid ? "success" : "danger"} />
      </View>
    </SurfaceCard>
  );
}

function PaymentPersonRow({ initials, name, team, status, amount, paid }: { initials: string; name: string; team: string; status: string; amount: number; paid: boolean }) {
  return (
    <View style={[styles.personRow, !paid && styles.personRowDanger]}>
      <InitialsAvatar label={initials} size={44} tone={paid ? "light" : "red"} />
      <View style={styles.flexOne}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowSubtitle}>{team} • {status}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, !paid && styles.errorText]}>{formatMoney(amount)}</Text>
        <Pill label={status} tone={paid ? "success" : "danger"} icon={paid ? "check-circle-outline" : "alert-circle-outline"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: spacing.sm },
  errorText: { color: colors.error },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.md },
  list: { gap: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  paymentRow: { gap: spacing.md },
  personRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  personRowDanger: { backgroundColor: "rgba(255, 218, 214, 0.25)", marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  primaryButton: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.full, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  primaryButtonText: { ...typography.label, color: colors.onPrimary },
  reminderCard: { alignItems: "center", backgroundColor: colors.primaryContainer, gap: spacing.sm },
  reminderMeta: { ...typography.label, color: colors.onPrimaryContainer },
  reminderTitle: { ...typography.title, color: colors.onPrimary, textAlign: "center" },
  rowAmount: { ...typography.title, color: colors.primary },
  rowLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowRight: { alignItems: "flex-end", gap: spacing.xs },
  rowSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  secondaryButton: { alignItems: "center", backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  secondaryButtonText: { ...typography.label, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  summaryCard: { gap: spacing.md },
  summaryGrid: { gap: spacing.sm },
  summaryIcon: { alignItems: "center", borderRadius: radius.full, height: 42, justifyContent: "center", width: 42 },
  summaryLabel: { ...typography.body, color: colors.onSurfaceVariant },
  summaryTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { ...typography.headline },
  tableCard: { paddingVertical: 0 },
  title: { ...typography.headline, color: colors.primary }
});
