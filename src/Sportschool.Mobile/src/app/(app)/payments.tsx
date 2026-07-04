import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { useAthleteSelection } from "@/core/athleteSelectionProvider";
import { useSession } from "@/core/sessionProvider";
import { usePaymentSettings, useSchoolMonthlyPayments, useUpdateAthleteFee, useUpdatePaymentSettings, useUpsertSchoolPayment } from "@/features/coach/api";
import type { SchoolMonthlyPaymentResponse } from "@/features/coach/types";
import { usePayments } from "@/features/me/api";
import type { PaymentResponse } from "@/features/me/types";
import { Button } from "@/shared/components/Button";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadingState } from "@/shared/components/LoadingState";
import { InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { TextField } from "@/shared/components/TextField";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatMonth } from "@/shared/utils/date";
import { formatMoney } from "@/shared/utils/money";
import { getPaymentLabel } from "@/shared/utils/status";

type PaymentFilter = "all" | "paid" | "unpaid";

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
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [editing, setEditing] = useState<SchoolMonthlyPaymentResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const paymentsQuery = useSchoolMonthlyPayments(year, month);
  const rows = paymentsQuery.data ?? [];

  const collected = rows.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0);
  const pending = rows.reduce((sum, row) => sum + (row.effectiveStatus === "Paid" ? 0 : row.balance ?? row.amount ?? 0), 0);

  const visibleRows = rows.filter((row) => {
    if (filter === "paid") {
      return row.effectiveStatus === "Paid";
    }
    if (filter === "unpaid") {
      return row.effectiveStatus !== "Paid";
    }
    return true;
  });

  const goToMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  return (
    <ScreenShell title={getShellTitle(session)} navItems={getMobileNav(session)}>
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <View style={styles.flexOne}>
            <Text style={styles.title}>Ödeme Takibi</Text>
            <Text style={styles.subtitle}>Aylık aidat durumlarını takip et.</Text>
          </View>
          <Pressable accessibilityLabel="Ödeme ayarları" onPress={() => setSettingsOpen(true)} style={styles.iconButton}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.monthNav}>
          <Pressable accessibilityLabel="Önceki ay" onPress={() => goToMonth(-1)} style={styles.monthNavButton}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.primary} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonth(year, month)}</Text>
          <Pressable accessibilityLabel="Sonraki ay" onPress={() => goToMonth(1)} style={styles.monthNavButton}>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile icon="wallet-outline" label="Tahsilat" value={formatMoney(collected)} tone="success" />
        <MetricTile icon="clock-alert-outline" label="Bekleyen" value={formatMoney(pending)} tone="danger" />
      </View>

      <View style={styles.filterRow}>
        <Pressable onPress={() => setFilter("all")}>
          <Pill label="Tümü" tone={filter === "all" ? "primary" : "neutral"} icon={filter === "all" ? "check" : undefined} />
        </Pressable>
        <Pressable onPress={() => setFilter("paid")}>
          <Pill label="Ödendi" tone={filter === "paid" ? "success" : "neutral"} />
        </Pressable>
        <Pressable onPress={() => setFilter("unpaid")}>
          <Pill label="Bekleyen" tone={filter === "unpaid" ? "danger" : "neutral"} icon={filter === "unpaid" ? "alert-circle-outline" : undefined} />
        </Pressable>
      </View>

      {paymentsQuery.isLoading ? (
        <LoadingState label="Ödemeler yükleniyor" />
      ) : rows.length === 0 ? (
        <SurfaceCard>
          <EmptyState title="Sporcu yok" description="Bu okulda aktif sporcu bulunmuyor." />
        </SurfaceCard>
      ) : (
        <SurfaceCard style={styles.tableCard}>
          {visibleRows.length === 0 ? (
            <Text style={styles.emptyFilter}>Bu filtrede kayıt yok.</Text>
          ) : (
            visibleRows.map((row) => (
              <CoachPaymentRow key={row.athleteProfileId} row={row} onPress={() => setEditing(row)} />
            ))
          )}
        </SurfaceCard>
      )}

      <PaymentEditorModal payment={editing} year={year} month={month} onClose={() => setEditing(null)} />
      <PaymentSettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </ScreenShell>
  );
}

function PaymentSettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const settingsQuery = usePaymentSettings(visible);
  const updateSettings = useUpdatePaymentSettings();
  const [fee, setFee] = useState("");
  const [day, setDay] = useState("");

  const settings = settingsQuery.data;
  useEffect(() => {
    if (visible && settings) {
      setFee(settings.defaultMonthlyFee != null ? String(settings.defaultMonthlyFee) : "");
      setDay(settings.paymentDayOfMonth != null ? String(settings.paymentDayOfMonth) : "");
    }
  }, [visible, settings]);

  const submit = () => {
    const trimmedFee = fee.trim();
    const trimmedDay = day.trim();

    let parsedFee: number | null = null;
    if (trimmedFee.length > 0) {
      parsedFee = Number(trimmedFee.replace(",", "."));
      if (!Number.isFinite(parsedFee) || parsedFee < 0) {
        Alert.alert("Geçersiz ücret", "Lütfen geçerli bir ücret girin.");
        return;
      }
    }

    let parsedDay: number | null = null;
    if (trimmedDay.length > 0) {
      parsedDay = Number(trimmedDay);
      if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 28) {
        Alert.alert("Geçersiz gün", "Ödeme günü 1 ile 28 arasında olmalıdır.");
        return;
      }
    }

    updateSettings.mutate(
      { defaultMonthlyFee: parsedFee, paymentDayOfMonth: parsedDay },
      {
        onSuccess: onClose,
        onError: () => Alert.alert("Hata", "Ayarlar kaydedilemedi. Lütfen tekrar deneyin.")
      }
    );
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ödeme Ayarları</Text>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.iconButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.modalSubtitle}>Okul geneli varsayılan aidat ve ödeme günü.</Text>
          <TextField label="Varsayılan aylık ücret (₺)" keyboardType="numeric" onChangeText={setFee} placeholder="0" value={fee} />
          <TextField label="Ödeme günü (1–28)" keyboardType="numeric" onChangeText={setDay} placeholder="örn. 5" value={day} />
          <Text style={styles.helperText}>{"Gelecek ayın aidatı, bu günden itibaren aktif olur. Boş bırakılırsa ayın 1'inde aktif olur."}</Text>
          <Button disabled={updateSettings.isPending} label={updateSettings.isPending ? "Kaydediliyor" : "Kaydet"} onPress={submit} />
          <Button disabled={updateSettings.isPending} label="Vazgeç" onPress={onClose} variant="outline" />
        </View>
      </View>
    </Modal>
  );
}

function CoachPaymentRow({ row, onPress }: { row: SchoolMonthlyPaymentResponse; onPress: () => void }) {
  const paid = row.effectiveStatus === "Paid";
  const hasAmount = row.amount !== null;
  const initials = row.athleteName.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const displayAmount = paid ? row.amountPaid ?? 0 : row.balance ?? row.amount ?? 0;

  return (
    <Pressable onPress={onPress} style={[styles.personRow, !paid && hasAmount && styles.personRowDanger]}>
      <InitialsAvatar label={initials || "?"} size={44} tone={paid ? "light" : "red"} />
      <View style={styles.flexOne}>
        <Text style={styles.rowTitle}>{row.athleteName}</Text>
        <Text style={styles.rowSubtitle}>{hasAmount ? getPaymentLabel(row.effectiveStatus) : "Tutar girilmedi"}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, !paid && hasAmount && styles.errorText]}>{hasAmount ? formatMoney(displayAmount) : "—"}</Text>
        <Pill
          label={getPaymentLabel(row.effectiveStatus)}
          tone={paid ? "success" : hasAmount ? "danger" : "neutral"}
          icon={paid ? "check-circle-outline" : undefined}
        />
      </View>
    </Pressable>
  );
}

function PaymentEditorModal({
  payment,
  year,
  month,
  onClose
}: {
  payment: SchoolMonthlyPaymentResponse | null;
  year: number;
  month: number;
  onClose: () => void;
}) {
  const upsert = useUpsertSchoolPayment(year, month);
  const updateFee = useUpdateAthleteFee();
  const settingsQuery = usePaymentSettings(payment !== null);
  const defaultFee = settingsQuery.data?.defaultMonthlyFee ?? null;
  const [paid, setPaid] = useState(false);
  const [hasCustomFee, setHasCustomFee] = useState(false);
  const [customFee, setCustomFee] = useState("");

  useEffect(() => {
    if (payment) {
      const override = payment.monthlyFeeOverride;
      setPaid(payment.effectiveStatus === "Paid");
      setHasCustomFee(override != null);
      setCustomFee(override != null ? String(override) : defaultFee != null ? String(defaultFee) : "");
    }
  }, [payment, defaultFee]);

  const submit = async () => {
    if (!payment) {
      return;
    }

    // When the toggle is on the athlete keeps a locked fee that ignores later default changes.
    let overrideTarget: number | null = null;
    if (hasCustomFee) {
      const parsed = Number(customFee.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert("Geçersiz aidat", "Lütfen sıfırdan büyük bir aidat girin.");
        return;
      }
      overrideTarget = parsed;
    }

    const feeChanged = overrideTarget !== (payment.monthlyFeeOverride ?? null);
    const targetFee = hasCustomFee ? overrideTarget : defaultFee;
    // Keep an already-recorded amount on a no-op fee edit; otherwise the fee drives it.
    const amount = payment.paymentId != null && !feeChanged ? payment.amount : targetFee;

    if (paid && (amount === null || amount <= 0)) {
      Alert.alert("Aidat belirtilmedi", "Ödeme kaydı için önce bir aidat tutarı belirleyin.");
      return;
    }

    try {
      if (feeChanged) {
        await updateFee.mutateAsync({
          athleteProfileId: payment.athleteProfileId,
          request: { monthlyFee: overrideTarget }
        });
      }
      if (amount !== null && amount > 0) {
        await upsert.mutateAsync({
          athleteProfileId: payment.athleteProfileId,
          request: {
            amount,
            amountPaid: paid ? amount : 0,
            status: paid ? "Paid" : "Pending",
            paidOn: paid ? new Date().toISOString().slice(0, 10) : null
          }
        });
      }
      onClose();
    } catch {
      Alert.alert("Hata", "Ödeme kaydedilemedi. Lütfen tekrar deneyin.");
    }
  };

  const saving = upsert.isPending || updateFee.isPending;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={payment !== null}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{payment?.athleteName}</Text>
            <Pressable accessibilityLabel="Kapat" onPress={onClose} style={styles.iconButton}>
              <MaterialCommunityIcons name="close" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.modalSubtitle}>{formatMonth(year, month)} aidatı</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Ödendi olarak işaretle</Text>
            <Switch onValueChange={setPaid} value={paid} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sporcuya özel aidat</Text>
            <Switch onValueChange={setHasCustomFee} value={hasCustomFee} />
          </View>
          {hasCustomFee ? (
            <>
              <TextField label="Sporcuya özel aylık ücret (₺)" keyboardType="numeric" onChangeText={setCustomFee} placeholder="0" value={customFee} />
              <Text style={styles.helperText}>Bu sporcu, okul varsayılan ücreti değişse de bu tutardan etkilenmez.</Text>
            </>
          ) : (
            <Text style={styles.helperText}>
              {defaultFee != null ? `Okul varsayılan ücreti uygulanır: ${formatMoney(defaultFee)}.` : "Okul varsayılan ücreti tanımlı değil."}
            </Text>
          )}
          <Button disabled={saving} label={saving ? "Kaydediliyor" : "Kaydet"} onPress={submit} />
          <Button disabled={saving} label="Vazgeç" onPress={onClose} variant="outline" />
        </View>
      </View>
    </Modal>
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
        <Text style={styles.title}>Ödemeler ve Aidat</Text>
        <Text style={styles.subtitle}>Finansal durumunu takip et.</Text>
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
              unpaid.map((payment) => <MemberPaymentRow key={`${payment.year}-${payment.month}`} payment={payment} />)
            )}
          </View>

          <SectionTitle title="Geçmiş Ödemeler" action="Tümünü Gör" />
          <View style={styles.list}>
            {paid.map((payment) => <MemberPaymentRow key={`${payment.year}-${payment.month}`} payment={payment} />)}
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

const styles = StyleSheet.create({
  emptyFilter: { ...typography.body, color: colors.onSurfaceVariant, paddingVertical: spacing.md, textAlign: "center" },
  errorText: { color: colors.error },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  flexOne: { flex: 1 },
  headerBlock: { gap: spacing.md },
  helperText: { ...typography.body, color: colors.onSurfaceVariant },
  iconButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  list: { gap: spacing.md },
  metricsRow: { flexDirection: "row", gap: spacing.sm },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, padding: spacing.lg },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  modalOverlay: { backgroundColor: "rgba(0, 0, 0, 0.4)", flex: 1, justifyContent: "flex-end" },
  modalSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  modalTitle: { ...typography.headline, color: colors.primary },
  monthLabel: { ...typography.title, color: colors.primary, textAlign: "center", textTransform: "capitalize" },
  monthNav: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "space-between" },
  monthNavButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.full, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  paymentRow: { gap: spacing.md },
  personRow: { alignItems: "center", borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  personRowDanger: { backgroundColor: "rgba(255, 218, 214, 0.25)", marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  rowAmount: { ...typography.title, color: colors.primary },
  rowLead: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowRight: { alignItems: "flex-end", gap: spacing.xs },
  rowSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.title, color: colors.primary },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginTop: spacing.xs },
  toggleLabel: { ...typography.title, color: colors.onSurface },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  summaryCard: { gap: spacing.md },
  summaryGrid: { gap: spacing.sm },
  summaryIcon: { alignItems: "center", borderRadius: radius.full, height: 42, justifyContent: "center", width: 42 },
  summaryLabel: { ...typography.body, color: colors.onSurfaceVariant },
  summaryTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { ...typography.headline },
  tableCard: { paddingVertical: 0 },
  title: { ...typography.headline, color: colors.primary },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" }
});
