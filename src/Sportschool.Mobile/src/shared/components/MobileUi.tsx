import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, usePathname } from "expo-router";
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type RefreshControlProps, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useUnreadAnnouncementCount } from "@/features/announcements/api";
import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { useSession } from "@/core/sessionProvider";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import { useResponsiveLayout } from "@/shared/design/responsive";

export type NavItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
  match: string;
};

export function ScreenShell({ children, title, avatar, navItems, contentStyle, refreshControl }: PropsWithChildren<{ title: string; avatar?: ReactNode; navItems?: NavItem[]; contentStyle?: ViewStyle; refreshControl?: ReactElement<RefreshControlProps> }>) {
  const insets = useSafeAreaInsets();
  const { isCompact, isTablet } = useResponsiveLayout();

  return (
    <SafeAreaView edges={["top"]} style={styles.shell}>
      <TopBar title={title} avatar={avatar} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isCompact && styles.contentCompact,
          isTablet && styles.contentTablet,
          navItems ? { paddingBottom: (isCompact ? 76 : 94) + insets.bottom } : styles.contentBottom,
          contentStyle
        ]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {navItems ? <BottomNav items={navItems} /> : null}
    </SafeAreaView>
  );
}

export function TopBar({ title, avatar }: { title: string; avatar?: ReactNode }) {
  const { session } = useSession();
  const { isCompact } = useResponsiveLayout();
  const isManager = session?.loginRole === "SchoolAdmin" || session?.loginRole === "Coach";
  const isMember = !isManager;
  const isAthlete = session?.loginRole === "Athlete";
  const unreadQuery = useUnreadAnnouncementCount(Boolean(session), isManager ? "manager" : "member");
  const hasUnread = isMember && (unreadQuery.data?.count ?? 0) > 0;
  const hasManagerUnread = isManager && (unreadQuery.data?.count ?? 0) > 0;

  if (isManager || isAthlete) {
    const hasTopBarUnread = isManager ? hasManagerUnread : hasUnread;

    return (
      <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
        <View style={styles.topBarButton}>
          <AcademyLogoAvatar size={isCompact ? 30 : 34} />
        </View>
        <Text numberOfLines={1} style={[styles.topTitle, isCompact && styles.topTitleCompact]}>{title}</Text>
        <Pressable accessibilityLabel="Duyurular" onPress={() => router.push("/announcements")} style={styles.topBarButton}>
          <MaterialCommunityIcons name="bell-outline" size={isCompact ? 23 : 26} color={colors.onSurfaceVariant} />
          {hasTopBarUnread ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.topBar, isCompact && styles.topBarCompact]}>
      <View style={styles.topLead}>{avatar ?? <AcademyLogoAvatar size={isCompact ? 28 : 30} />}</View>
      <Text numberOfLines={1} style={[styles.topTitle, isCompact && styles.topTitleCompact]}>{title}</Text>
      <View style={styles.topActions}>
        {!isAthlete ? (
          <Pressable accessibilityLabel="Profil" onPress={() => router.push("/profile")} style={styles.iconButton}>
            <MaterialCommunityIcons name="account-outline" size={isCompact ? 22 : 24} color={colors.primary} />
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel="Duyurular" onPress={() => router.push("/announcements")} style={styles.iconButton}>
          <MaterialCommunityIcons name="bell-outline" size={isCompact ? 22 : 24} color={colors.primary} />
          {hasUnread ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.bottomNav, isCompact && styles.bottomNavCompact, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const active = pathname.includes(item.match);
        return (
          <Pressable key={item.match} onPress={() => router.push(item.href)} style={[styles.navItem, isCompact && styles.navItemCompact, active && styles.navItemActive]}>
            <MaterialCommunityIcons name={item.icon} size={isCompact ? 21 : 23} color={active ? colors.onPrimary : colors.onSurfaceVariant} />
            <Text style={[styles.navLabel, isCompact && styles.navLabelCompact, active && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SurfaceCard({ children, style, accent }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; accent?: "primary" | "secondary" | "error" | "warning" }>) {
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.card, isCompact && styles.cardCompact, style]}>
      {accent ? <View style={[styles.cardAccent, accent === "primary" && styles.accentPrimary, accent === "secondary" && styles.accentSecondary, accent === "error" && styles.accentError, accent === "warning" && styles.accentWarning]} /> : null}
      {children}
    </View>
  );
}

export function Pill({ label, tone = "neutral", icon }: { label: string; tone?: "primary" | "success" | "danger" | "warning" | "neutral"; icon?: keyof typeof MaterialCommunityIcons.glyphMap }) {
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={[styles.pill, isCompact && styles.pillCompact, pillStyles[tone].wrap]}>
      {icon ? <MaterialCommunityIcons name={icon} size={isCompact ? 13 : 15} color={pillStyles[tone].text.color} /> : null}
      <Text style={[styles.pillText, isCompact && styles.pillTextCompact, pillStyles[tone].text]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  const { isCompact } = useResponsiveLayout();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, isCompact && styles.sectionTitleCompact]}>{title}</Text>
      {action ? <Text style={[styles.sectionAction, isCompact && styles.sectionActionCompact]}>{action}</Text> : null}
    </View>
  );
}

export function MetricTile({ icon, label, value, tone = "primary" }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone?: "primary" | "success" | "danger" | "warning" }) {
  const color = tone === "success" ? colors.secondary : tone === "danger" ? colors.error : tone === "warning" ? colors.primaryFixedDim : colors.primaryContainer;
  return (
    <SurfaceCard style={styles.metricTile}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </SurfaceCard>
  );
}

export function InitialsAvatar({ label, size = 42, tone = "light" }: { label: string; size?: number; tone?: "dark" | "light" | "green" | "red" }) {
  const backgroundColor = tone === "dark" ? colors.surfaceContainerHigh : tone === "green" ? colors.secondaryContainer : tone === "red" ? colors.errorContainer : colors.primaryContainer;
  const color = tone === "dark" ? colors.primary : tone === "green" ? colors.onSecondaryContainer : tone === "red" ? colors.onErrorContainer : colors.onPrimary;
  return (
    <View style={[styles.initialsAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Text style={[styles.initialsText, { color }]}>{label}</Text>
    </View>
  );
}

export function ProfileAvatar({ uri, label, size = 42, tone = "light" }: { uri?: string | null; label: string; size?: number; tone?: "dark" | "light" | "green" | "red" }) {
  if (!uri) {
    return <InitialsAvatar label={label} size={size} tone={tone} />;
  }

  return <Image accessibilityLabel={`${label} profil fotoğrafı`} source={{ uri }} style={[styles.profileAvatar, { width: size, height: size, borderRadius: size / 2 }]} />;
}

export function CircularScore({ value, label, color = colors.secondary, size = 62 }: { value: number; label: string; color?: string; size?: number }) {
  const stroke = 5;
  const radiusValue = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(value, 100)) / 100);

  return (
    <View style={styles.circularScore}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={colors.surfaceContainerHigh} strokeWidth={stroke} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusValue}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={styles.scoreCenter}>
          <Text style={styles.scoreNumber}>{Math.round(value)}</Text>
        </View>
      </View>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

export function BarChart({ values }: { values: number[] }) {
  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartBars}>
        {values.map((value, index) => (
          <View key={`${value}-${index}`} style={styles.chartColumn}>
            <View style={[styles.chartBar, { height: `${Math.max(18, value)}%`, backgroundColor: index === values.length - 1 ? colors.primary : index === 3 ? "rgba(0,109,68,0.6)" : colors.surfaceContainerHigh }]} />
            <Text style={[styles.chartLabel, index === values.length - 1 && styles.chartLabelActive]}>H{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const pillStyles = {
  primary: { wrap: { backgroundColor: colors.primaryContainer }, text: { color: colors.onPrimary } },
  success: { wrap: { backgroundColor: "rgba(52,211,153,0.16)" }, text: { color: colors.secondary } },
  danger: { wrap: { backgroundColor: colors.errorContainer }, text: { color: colors.onErrorContainer } },
  warning: { wrap: { backgroundColor: "rgba(250,204,21,0.16)" }, text: { color: colors.primaryContainer } },
  neutral: { wrap: { backgroundColor: colors.surfaceContainerLow }, text: { color: colors.onSurfaceVariant } }
} as const;

const styles = StyleSheet.create({
  accentError: { backgroundColor: colors.error },
  accentPrimary: { backgroundColor: colors.primary },
  accentSecondary: { backgroundColor: colors.secondary },
  accentWarning: { backgroundColor: colors.tertiaryFixedDim },
  bottomNav: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainer,
    borderTopColor: colors.outlineVariant,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    position: "absolute",
    right: 0
  },
  bottomNavCompact: { minHeight: 60, paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  card: {
    backgroundColor: colors.surfaceContainer,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.md
  },
  cardCompact: { padding: 10 },
  cardAccent: { bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  chartBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, width: "100%" },
  chartBars: { alignItems: "flex-end", borderBottomColor: colors.surfaceContainerHigh, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, height: 160 },
  chartColumn: { alignItems: "center", flex: 1, gap: spacing.sm, height: "100%", justifyContent: "flex-end" },
  chartLabel: { ...typography.label, color: colors.onSurfaceVariant },
  chartLabelActive: { color: colors.primary },
  chartWrap: { gap: spacing.md },
  circularScore: { alignItems: "center", gap: spacing.sm },
  content: { gap: spacing.lg, padding: spacing.md },
  contentCompact: { gap: spacing.md, padding: 10 },
  contentBottom: { paddingBottom: spacing.xl },
  contentTablet: { alignSelf: "center", maxWidth: 680, width: "100%" },
  iconButton: { alignItems: "center", height: 44, justifyContent: "center", position: "relative", width: 44 },
  initialsAvatar: { alignItems: "center", justifyContent: "center" },
  initialsText: { ...typography.title },
  profileAvatar: { backgroundColor: colors.primaryFixed, resizeMode: "cover" },
  metricLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  metricTile: { flex: 1, gap: spacing.sm, minHeight: 96 },
  metricValue: { ...typography.headline },
  navItem: { alignItems: "center", borderRadius: radius.lg, gap: 2, minWidth: 78, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  navItemCompact: { minHeight: 48, minWidth: 70, paddingHorizontal: 10, paddingVertical: spacing.xs },
  navItemActive: { backgroundColor: colors.primary },
  navLabel: { ...typography.label, color: colors.onSurfaceVariant, letterSpacing: 0.4, textAlign: "center" },
  navLabelCompact: { fontSize: 11, lineHeight: 15 },
  navLabelActive: { color: colors.onPrimary },
  notificationDot: { backgroundColor: colors.error, borderRadius: 5, height: 10, position: "absolute", right: 8, top: 7, width: 10 },
  pill: { alignItems: "center", alignSelf: "flex-start", borderRadius: radius.full, flexDirection: "row", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pillCompact: { paddingHorizontal: 10, paddingVertical: spacing.xs },
  pillText: { ...typography.label },
  pillTextCompact: { fontSize: 11, lineHeight: 15 },
  scoreCenter: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  scoreLabel: { ...typography.label, color: colors.onSurfaceVariant, textAlign: "center" },
  scoreNumber: { ...typography.title, color: colors.primary },
  sectionAction: { ...typography.label, color: colors.primaryContainer },
  sectionActionCompact: { fontSize: 11, lineHeight: 15 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { ...typography.title, color: colors.onSurface },
  sectionTitleCompact: { fontSize: 15, lineHeight: 20 },
  shell: { backgroundColor: colors.background, flex: 1 },
  topBar: { alignItems: "center", backgroundColor: colors.background, borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", height: 58, justifyContent: "space-between", paddingHorizontal: spacing.md },
  topBarCompact: { height: 50, paddingHorizontal: 10 },
  topBarButton: { alignItems: "center", height: 44, justifyContent: "center", position: "relative", width: 44 },
  topActions: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end", width: 80 },
  topLead: { alignItems: "flex-start", height: 44, justifyContent: "center", width: 80 },
  topTitle: { ...typography.headline, color: colors.primary, flex: 1, textAlign: "center" },
  topTitleCompact: { fontSize: 17, lineHeight: 22 }
});
