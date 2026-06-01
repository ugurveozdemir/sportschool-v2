import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { useMemberAnnouncements } from "@/features/announcements/api";
import type { AnnouncementResponse } from "@/features/announcements/types";
import { useCoachSummary } from "@/features/coach/api";
import type { CoachSummaryResponse } from "@/features/coach/types";
import { useAttendance, useGroups, usePayments, useProfile, useReports, useTrainings } from "@/features/me/api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CircularScore, InitialsAvatar, MetricTile, Pill, ScreenShell, SectionTitle, SurfaceCard } from "@/shared/components/MobileUi";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { getMobileNav, getShellTitle } from "@/shared/navigation/mobileNav";
import { formatTime } from "@/shared/utils/date";
import { formatMoney } from "@/shared/utils/money";

export default function HomeScreen() {
  const { session } = useSession();
  const isCoach = session?.roles.includes("Coach") ?? false;
  const isParent = session?.roles.includes("Parent") ?? false;
  const navItems = getMobileNav(session);
  const shellTitle = getShellTitle(session);

  const profileQuery = useProfile(!isCoach);
  const trainingsQuery = useTrainings(!isCoach);
  const groupsQuery = useGroups(!isCoach);
  const attendanceQuery = useAttendance(!isCoach);
  const paymentsQuery = usePayments(!isCoach);
  const reportsQuery = useReports(!isCoach);
  const announcementsQuery = useMemberAnnouncements(!isCoach, true);
  const coachSummaryQuery = useCoachSummary(isCoach);

  if (isCoach) {
    return <CoachHome sessionName={session?.fullName} summary={coachSummaryQuery.data} navItems={navItems} shellTitle={shellTitle} />;
  }

  const profile = profileQuery.data;
  const trainings = trainingsQuery.data ?? [];
  const nextTraining = trainings.find((training) => new Date(training.startsAt).getTime() >= Date.now()) ?? trainings[0];
  const payments = paymentsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const unpaidCount = payments.filter((payment) => payment.effectiveStatus !== "Paid").length;
  const unpaidTotal = payments.reduce((sum, payment) => sum + (payment.effectiveStatus === "Paid" ? 0 : payment.balance), 0);
  const latestReport = reportsQuery.data?.[0];

  if (isParent) {
    return (
      <ParentHome
        navItems={navItems}
        shellTitle={shellTitle}
        parentName={session?.fullName?.split(" ")[0] ?? "Mehmet"}
        childName={profile?.firstName ?? "Emre"}
        nextTraining={nextTraining}
        unpaidTotal={unpaidTotal}
        announcements={announcements.slice(0, 2)}
        reportScore={latestReport ? averageScore([latestReport.speedScore, latestReport.strengthScore, latestReport.dribblingScore, latestReport.shootingScore]) : 8.4}
      />
    );
  }

  return (
    <AthleteHome
      navItems={navItems}
      shellTitle={shellTitle}
      firstName={profile?.firstName ?? "Arda"}
      nextTraining={nextTraining}
      groupCount={groupsQuery.data?.length ?? 0}
      attendanceCount={attendanceQuery.data?.length ?? 0}
      announcementCount={announcements.length}
      unpaidCount={unpaidCount}
      latestReport={latestReport}
    />
  );
}

function CoachHome({ sessionName, summary, navItems, shellTitle }: { sessionName?: string; summary?: CoachSummaryResponse; navItems: ReturnType<typeof getMobileNav>; shellTitle: string }) {
  const todayTrainings = summary?.todayTrainings ?? [];

  return (
    <ScreenShell title={shellTitle} navItems={navItems}>
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.dateText}>24 Ekim Perşembe</Text>
          <Text style={styles.displayTitle}>Merhaba, {sessionName?.split(" ")[0] ?? "Koç"}</Text>
        </View>
        <InitialsAvatar label="KÇ" size={54} tone="dark" />
      </View>

      <View style={styles.sectionStack}>
        <SectionTitle title="Bugünkü Etkinlikler" />
        {todayTrainings.length > 0 ? (
          todayTrainings.map((training) => (
            <EventCard
              key={training.id}
              accent="secondary"
              icon="run"
              kicker={`${formatTime(training.startsAt)} • ${training.location ?? "Konum girilmedi"}`}
              title={training.title}
              description={training.notes?.trim() || undefined}
              onPress={() => router.push(`/trainings/${training.id}`)}
            />
          ))
        ) : (
          <SurfaceCard>
            <EmptyState title="Bugün antrenman yok" description="Bugün için atanmış antrenman bulunmuyor." />
          </SurfaceCard>
        )}
      </View>

      <View style={styles.sectionStack}>
        <SectionTitle title="Hızlı Aksiyonlar" />
        <View style={styles.quickGrid}>
          <QuickAction label="Yoklama Al" icon="clipboard-check-outline" primary />
          <QuickAction label="Ödeme Kaydet" icon="cash-multiple" tone="green" />
          <QuickAction label="Duyuru Yayınla" icon="bullhorn-outline" tone="dark" onPress={() => router.push("/announcements")} />
        </View>
      </View>

      <SurfaceCard style={styles.sectionStack}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="alert-outline" size={30} color={colors.error} />
            <Text style={styles.cardTitle}>Bekleyen Ödemeler</Text>
          </View>
          <Text style={styles.mutedBold}>Tümü</Text>
        </View>
        <PaymentRow initials="CK" name="Caner Kaya" detail="Eylül Aidatı" amount="₺1.500" />
        <View style={styles.separator} />
        <PaymentRow initials="MY" name="Mert Yılmaz" detail="Eylül Aidatı" amount="₺1.500" />
      </SurfaceCard>

      <SurfaceCard style={styles.sectionStack}>
        <View style={styles.iconTitleRow}>
          <MaterialCommunityIcons name="account-off-outline" size={30} color={colors.outline} />
          <Text style={styles.cardTitle}>Eksik Oyuncular</Text>
        </View>
        <View style={styles.chipRow}>
          <Pill label="A. Öztürk (Sakat)" tone="danger" />
          <Pill label="B. Şahin (İzinli)" tone="warning" />
        </View>
      </SurfaceCard>
    </ScreenShell>
  );
}

function AthleteHome({ navItems, shellTitle, firstName, nextTraining, groupCount, attendanceCount, announcementCount, unpaidCount, latestReport }: { navItems: ReturnType<typeof getMobileNav>; shellTitle: string; firstName: string; nextTraining?: { title: string; startsAt: string; endsAt: string; location: string | null }; groupCount: number; attendanceCount: number; announcementCount: number; unpaidCount: number; latestReport?: { summary: string; createdAt: string; speedScore: number; strengthScore: number; dribblingScore: number; shootingScore: number } }) {
  const speed = latestReport?.speedScore ?? 85;
  const technique = latestReport?.dribblingScore ?? 72;
  const condition = latestReport?.strengthScore ?? 92;

  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<InitialsAvatar label={firstName.slice(0, 1)} size={42} tone="dark" />}>
      <View style={styles.headerBlock}>
        <Text style={styles.displayTitle}>Merhaba, {firstName}</Text>
        <Text style={styles.subtitle}>Performansına odaklan, sınırlarını zorla.</Text>
      </View>

      <HeroTrainingCard title={nextTraining?.title ?? "Taktik ve Çift Kale Maç"} location={nextTraining?.location ?? "Saha 1"} group="A Takımı" time={nextTraining ? formatTime(nextTraining.startsAt) : "17:00"} />

      <View style={styles.sectionStack}>
        <SectionTitle title="Hızlı İşlemler" />
        <View style={styles.quickGrid}>
          <QuickAction label="Yoklama\nDurumum" icon="account-check-outline" />
          <QuickAction label="Beslenme\nProgramı" icon="silverware-fork-knife" />
          <QuickAction label="Duyurular" icon="bullhorn-outline" badge={announcementCount > 0} onPress={() => router.push("/announcements")} />
        </View>
      </View>

      <SurfaceCard style={styles.sectionStack}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="chart-line" size={28} color={colors.secondary} />
            <Text style={styles.cardTitle}>Gelişim Özeti</Text>
          </View>
          <Text style={styles.linkText}>Detaylar</Text>
        </View>
        <View style={styles.scoreRow}>
          <CircularScore label="Hız" value={speed} color={colors.secondary} />
          <CircularScore label="Teknik" value={technique} color={colors.primary} />
          <CircularScore label="Kondisyon" value={condition} color={colors.secondaryFixedDim} />
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.sectionStack}>
        <View style={styles.iconTitleRow}>
          <MaterialCommunityIcons name="calendar-month-outline" size={28} color={colors.primary} />
          <Text style={styles.cardTitle}>Yaklaşan Maçlar</Text>
        </View>
        <MatchRow initials="GS" name="Galatasaray U19" date="12 Kas, 14:00" />
        <MatchRow initials="BJK" name="Beşiktaş U19" date="19 Kas, 15:30" />
      </SurfaceCard>

      <View style={styles.metricsRow}>
        <MetricTile icon="account-group-outline" label="Grup" value={`${groupCount}`} />
        <MetricTile icon="calendar-check-outline" label="Yoklama" value={`${attendanceCount}`} />
        <MetricTile icon="credit-card-clock-outline" label="Borç" value={`${unpaidCount}`} tone={unpaidCount > 0 ? "danger" : "primary"} />
      </View>
    </ScreenShell>
  );
}

function ParentHome({ navItems, shellTitle, parentName, childName, nextTraining, unpaidTotal, announcements, reportScore }: { navItems: ReturnType<typeof getMobileNav>; shellTitle: string; parentName: string; childName: string; nextTraining?: { title: string; startsAt: string; endsAt: string; location: string | null }; unpaidTotal: number; announcements: AnnouncementResponse[]; reportScore: number }) {
  return (
    <ScreenShell title={shellTitle} navItems={navItems} avatar={<InitialsAvatar label={childName.slice(0, 1)} size={42} tone="light" />}>
      <View style={styles.headerBlockSmallGap}>
        <Text style={styles.parentTitle}>Günaydın, {parentName}</Text>
        <Text style={styles.subtitle}>Bugün {nextTraining ? "1 antrenman" : "antrenman yok"} ve {announcements.length} güncel duyuru var.</Text>
        <View style={styles.childSwitch}>
          <View style={styles.childSwitchActive}>
            <InitialsAvatar label={childName.slice(0, 1)} size={24} tone="dark" />
            <Text style={styles.childSwitchActiveText}>{childName} (U12)</Text>
          </View>
          <View style={styles.childSwitchInactive}>
            <InitialsAvatar label="K" size={24} tone="light" />
            <Text style={styles.childSwitchText}>Kerem (U15)</Text>
          </View>
        </View>
      </View>

      <SurfaceCard style={styles.parentTrainingCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconTitleRow}>
            <MaterialCommunityIcons name="soccer" size={24} color={colors.secondary} />
            <Text style={styles.parentCardTitle}>Sıradaki Antrenman</Text>
          </View>
          <Pill label="Bugün" tone="success" />
        </View>
        <Text style={styles.smallMeta}>U12 A Takımı • {nextTraining?.title ?? "Taktik & Kondisyon"}</Text>
        <View style={styles.parentInfoBox}>
          <InitialsAvatar label="◷" size={48} tone="dark" />
          <View>
            <Text style={styles.kickerDark}>Zaman</Text>
            <Text style={styles.infoTitle}>{nextTraining ? `${formatTime(nextTraining.startsAt)} - ${formatTime(nextTraining.endsAt)}` : "17:30 - 19:00"}</Text>
          </View>
        </View>
        <View style={styles.parentInfoBox}>
          <InitialsAvatar label="⌖" size={48} tone="light" />
          <View>
            <Text style={styles.kickerDark}>Tesis</Text>
            <Text style={styles.infoTitle}>{nextTraining?.location ?? "Merkez Kampüs Saha 2"}</Text>
          </View>
        </View>
      </SurfaceCard>

      <View style={styles.darkScoreCard}>
        <Text style={styles.darkCardTitle}>Gelişim Özeti</Text>
        <Text style={styles.darkSubtitle}>Son 30 günlük performans</Text>
        <View style={styles.scoreInline}>
          <Text style={styles.largeWhite}>{reportScore.toFixed(1)}</Text>
          <Text style={styles.greenText}>↗ 0.3 puan</Text>
        </View>
        <Progress label="Devamlılık" value={95} />
        <Progress label="Teknik Kapasite" value={82} light />
      </View>

      <SurfaceCard style={styles.noPaddingCard}>
          <View style={styles.cardInsetHeader}>
            <Text style={styles.parentCardTitle}>Kulüp Duyuruları</Text>
            <Pressable onPress={() => router.push("/announcements")}>
              <Text style={styles.linkText}>Tümünü Gör</Text>
            </Pressable>
          </View>
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <AnnouncementItem
              date={announcement.expiresAt ? `Bitiş: ${new Date(announcement.expiresAt).toLocaleDateString("tr-TR")}` : "Süresiz"}
              dotColor={announcement.isNew ? colors.secondary : colors.outlineVariant}
              key={announcement.id}
              text={announcement.content}
              title={announcement.title}
            />
          ))
        ) : (
          <View style={styles.emptyAnnouncement}>
            <Text style={styles.rowMeta}>Güncel duyuru bulunmuyor.</Text>
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionStack}>
        <Text style={styles.parentCardTitle}>Finansal Durum</Text>
        <View style={styles.debtBox}>
          <InitialsAvatar label="!" size={42} tone="red" />
          <View style={styles.flexOne}>
            <Text style={styles.infoTitle}>Kasım Ayı Aidatı</Text>
            <Text style={styles.smallMeta}>Son Ödeme: 05 Kasım 2023</Text>
          </View>
          <View style={styles.rightText}>
            <Text style={styles.infoTitle}>{formatMoney(unpaidTotal || 1250)}</Text>
            <Text style={styles.errorSmall}>Gecikmede</Text>
          </View>
        </View>
        <View style={styles.payButton}>
          <Text style={styles.payButtonText}>Şimdi Öde</Text>
        </View>
        <View style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Geçmiş Ödemeler</Text>
        </View>
      </SurfaceCard>
    </ScreenShell>
  );
}

function EventCard({ accent, icon, kicker, title, description, onPress }: {
  accent: "primary" | "secondary";
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  kicker: string;
  title: string;
  description?: string;
  onPress?: () => void;
}) {
  const content = (
    <SurfaceCard accent={accent} style={styles.eventCard}>
      <View style={styles.eventIconCircle}>
        <MaterialCommunityIcons name={icon} size={28} color={accent === "secondary" ? colors.secondary : colors.primary} />
      </View>
      <View style={styles.flexOne}>
        <Text style={[styles.eventKicker, accent === "secondary" && styles.greenText]}>{kicker}</Text>
        <Text style={styles.eventTitle}>{title}</Text>
        {description ? <Text style={styles.eventDescription}>{description}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={30} color={colors.outlineVariant} />
    </SurfaceCard>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} detayını aç`} onPress={onPress}>
      {content}
    </Pressable>
  );
}

function QuickAction({ label, icon, primary, badge, tone, onPress }: { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; primary?: boolean; badge?: boolean; tone?: "green" | "dark"; onPress?: () => void }) {
  const highlighted = primary || tone;
  const content = (
    <>
      {badge ? <View style={styles.smallRedDot} /> : null}
      <View style={[styles.quickIconCircle, highlighted && styles.quickIconHighlight]}>
        <MaterialCommunityIcons name={icon} size={26} color={highlighted ? colors.onPrimary : colors.primary} />
      </View>
      <Text style={[styles.quickText, highlighted && styles.quickTextPrimary]}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.quickAction, primary && styles.quickActionPrimary, tone === "green" && styles.quickActionGreen, tone === "dark" && styles.quickActionDark]}>{content}</View>;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.quickAction, primary && styles.quickActionPrimary, tone === "green" && styles.quickActionGreen, tone === "dark" && styles.quickActionDark]}>
      {content}
    </Pressable>
  );
}

function PaymentRow({ initials, name, detail, amount }: { initials: string; name: string; detail: string; amount: string }) {
  return (
    <View style={styles.paymentRow}>
      <InitialsAvatar label={initials} />
      <View style={styles.flexOne}>
        <Text style={styles.rowTitle}>{name}</Text>
        <Text style={styles.rowMeta}>{detail}</Text>
      </View>
      <Text style={styles.amountRed}>{amount}</Text>
    </View>
  );
}

function MatchRow({ initials, name, date }: { initials: string; name: string; date: string }) {
  return (
    <View style={styles.matchRow}>
      <InitialsAvatar label={initials} size={54} />
      <View style={styles.flexOne}>
        <Text style={styles.matchTitle}>{name}</Text>
        <Text style={styles.rowMeta}>{date}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={30} color={colors.outlineVariant} />
    </View>
  );
}

function HeroTrainingCard({ title, location, group, time }: { title: string; location: string; group: string; time: string }) {
  return (
    <View style={styles.heroCard}>
      <MaterialCommunityIcons name="soccer" size={190} color="rgba(255,255,255,0.09)" style={styles.heroIcon} />
      <View style={styles.iconTitleRow}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.secondaryContainer} />
        <Text style={styles.heroKicker}>Sıradaki Antrenman</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.heroText}>⌖ {location}</Text>
        <Text style={styles.heroText}>♟ {group}</Text>
      </View>
      <View style={styles.countdownBox}>
        <Text style={styles.heroText}>Başlamasına</Text>
        <Text style={styles.countdown}>02:15</Text>
        <Text style={styles.heroText}>{time}</Text>
      </View>
    </View>
  );
}

function Progress({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <View style={styles.progressWrap}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressLabel}>{value}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${value}%`, backgroundColor: light ? colors.primaryFixed : colors.secondaryContainer }]} />
      </View>
    </View>
  );
}

function AnnouncementItem({ dotColor, title, text, date }: { dotColor: string; title: string; text: string; date: string }) {
  return (
    <View style={styles.announcementItem}>
      <View style={[styles.announcementDot, { backgroundColor: dotColor }]} />
      <View style={styles.flexOne}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{text}</Text>
        <Text style={styles.dateSmall}>{date}</Text>
      </View>
    </View>
  );
}

function averageScore(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

const styles = StyleSheet.create({
  amountRed: { ...typography.title, color: colors.error },
  announcementDot: { borderRadius: 4, height: 8, marginTop: 7, width: 8 },
  announcementItem: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  cardHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  cardInsetHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: spacing.lg },
  cardTitle: { ...typography.headline, color: colors.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  childSwitch: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, borderRadius: radius.full, borderWidth: 1, flexDirection: "row", padding: 4 },
  childSwitchActive: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.full, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.sm },
  childSwitchActiveText: { ...typography.label, color: colors.onPrimary },
  childSwitchInactive: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", padding: spacing.sm },
  childSwitchText: { ...typography.label, color: colors.onSurfaceVariant },
  countdown: { ...typography.headline, color: colors.secondaryContainer },
  countdownBox: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(215,226,255,0.15)", borderColor: "rgba(215,226,255,0.2)", borderRadius: radius.md, borderWidth: 1, gap: 2, marginTop: spacing.lg, minWidth: 132, padding: spacing.md },
  darkCardTitle: { ...typography.title, color: colors.onPrimary },
  darkScoreCard: { backgroundColor: colors.primary, borderRadius: radius.lg, gap: spacing.sm, padding: spacing.lg },
  darkSubtitle: { ...typography.body, color: colors.primaryFixedDim },
  dateSmall: { ...typography.label, color: colors.outline, marginTop: spacing.sm },
  dateText: { ...typography.bodyLarge, color: colors.onSurfaceVariant, marginBottom: 4 },
  debtBox: { alignItems: "center", backgroundColor: "rgba(255,218,214,0.35)", borderColor: colors.errorContainer, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  displayTitle: { ...typography.display, color: colors.primary },
  errorSmall: { ...typography.label, color: colors.error },
  emptyAnnouncement: { borderTopColor: colors.outlineVariant, borderTopWidth: 1, padding: spacing.lg },
  eventCard: { alignItems: "center", flexDirection: "row", gap: spacing.md, paddingLeft: spacing.xl },
  eventIconCircle: { alignItems: "center", backgroundColor: colors.surfaceContainerLow, borderRadius: radius.full, height: 62, justifyContent: "center", width: 62 },
  eventDescription: { ...typography.body, color: colors.onSurfaceVariant, marginTop: 3 },
  eventKicker: { ...typography.label, color: colors.primary, textTransform: "uppercase" },
  eventTitle: { ...typography.headline, color: colors.primary },
  flexOne: { flex: 1 },
  greenText: { color: colors.secondary },
  headerBlock: { gap: spacing.sm },
  headerBlockSmallGap: { gap: spacing.sm },
  heroCard: { backgroundColor: colors.primary, borderRadius: radius.xl, gap: spacing.sm, overflow: "hidden", padding: spacing.xl },
  heroIcon: { position: "absolute", right: -38, top: -22 },
  heroKicker: { ...typography.label, color: colors.secondaryContainer, textTransform: "uppercase" },
  heroText: { ...typography.bodyLarge, color: colors.primaryFixedDim },
  heroTitle: { ...typography.headline, color: colors.onPrimary },
  iconTitleRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  infoTitle: { ...typography.title, color: colors.primary },
  kickerDark: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  largeWhite: { ...typography.display, color: colors.onPrimary, fontSize: 48, lineHeight: 56 },
  linkText: { ...typography.label, color: colors.primary },
  matchRow: { alignItems: "center", borderColor: colors.borderSoft, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  matchTitle: { ...typography.title, color: colors.primary },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  metricsRow: { flexDirection: "row", gap: spacing.md },
  mutedBold: { ...typography.title, color: colors.outline },
  noPaddingCard: { padding: 0 },
  outlineButton: { alignItems: "center", borderColor: colors.outlineVariant, borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  outlineButtonText: { ...typography.title, color: colors.primary },
  parentCardTitle: { ...typography.title, color: colors.primary },
  parentInfoBox: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceContainerHigh, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  parentTitle: { ...typography.headline, color: colors.primary },
  parentTrainingCard: { backgroundColor: "rgba(232,255,243,0.45)", gap: spacing.md },
  payButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md },
  payButtonText: { ...typography.title, color: colors.onPrimary },
  paymentRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  progressFill: { borderRadius: radius.full, height: "100%" },
  progressLabel: { ...typography.label, color: colors.onPrimary },
  progressTrack: { backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.full, height: 7, overflow: "hidden" },
  progressWrap: { gap: 4 },
  quickAction: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.borderSoft, borderRadius: radius.lg, borderWidth: 1, flex: 1, gap: spacing.sm, minHeight: 130, justifyContent: "center", padding: spacing.sm },
  quickActionDark: { backgroundColor: "#2f343d", borderColor: "#2f343d" },
  quickActionGreen: { backgroundColor: "#00472d", borderColor: "#00472d" },
  quickActionPrimary: { backgroundColor: colors.primary },
  quickGrid: { flexDirection: "row", gap: spacing.md },
  quickIconCircle: { alignItems: "center", backgroundColor: colors.primaryFixed, borderRadius: radius.full, height: 54, justifyContent: "center", width: 54 },
  quickIconHighlight: { backgroundColor: "rgba(255,255,255,0.16)" },
  quickText: { ...typography.label, color: colors.primary, fontSize: 14, lineHeight: 18, textAlign: "center" },
  quickTextPrimary: { color: colors.onPrimary },
  rightText: { alignItems: "flex-end" },
  rowMeta: { ...typography.body, color: colors.onSurfaceVariant },
  rowTitle: { ...typography.bodyLarge, color: colors.primary },
  scoreInline: { alignItems: "flex-end", flexDirection: "row", gap: spacing.sm },
  scoreRow: { flexDirection: "row", justifyContent: "space-around" },
  sectionStack: { gap: spacing.lg },
  separator: { backgroundColor: colors.borderSoft, height: 1 },
  smallMeta: { ...typography.body, color: colors.onSurfaceVariant },
  smallRedDot: { backgroundColor: colors.error, borderRadius: 5, height: 10, position: "absolute", right: spacing.md, top: spacing.md, width: 10 },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant },
  welcomeRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }
});
