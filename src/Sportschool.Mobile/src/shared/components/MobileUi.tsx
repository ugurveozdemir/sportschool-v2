import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, usePathname } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { useUnreadAnnouncementCount } from "@/features/announcements/api";
import { AkademiLogo } from "@/shared/components/AkademiLogo";
import { useSession } from "@/core/sessionProvider";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";

export type NavItem = {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
  match: string;
};

export function ScreenShell({ children, title, avatar, navItems, contentStyle }: PropsWithChildren<{ title: string; avatar?: ReactNode; navItems?: NavItem[]; contentStyle?: ViewStyle }>) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top"]} style={styles.shell}>
      <TopBar title={title} avatar={avatar} />
      <ScrollView
        contentContainerStyle={[styles.content, navItems ? { paddingBottom: 104 + insets.bottom } : styles.contentBottom, contentStyle]}
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
  const isMember = !session?.roles.includes("Coach") && !session?.roles.includes("SchoolAdmin");
  const unreadQuery = useUnreadAnnouncementCount(isMember);
  const hasUnread = isMember && (unreadQuery.data?.count ?? 0) > 0;

  return (
    <View style={styles.topBar}>
      <View style={styles.topLead}>{avatar ?? <AkademiLogo size={30} />}</View>
      <Text style={styles.topTitle}>{title}</Text>
      <View style={styles.topActions}>
        <Pressable accessibilityLabel="Profil" onPress={() => router.push("/profile")} style={styles.iconButton}>
          <MaterialCommunityIcons name="account-outline" size={26} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityLabel="Duyurular" onPress={() => router.push("/announcements")} style={styles.iconButton}>
          <MaterialCommunityIcons name="bell-outline" size={26} color={colors.primary} />
          {hasUnread ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>
    </View>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {items.map((item) => {
        const active = pathname.includes(item.match);
        return (
          <Pressable key={item.match} onPress={() => router.push(item.href)} style={[styles.navItem, active && styles.navItemActive]}>
            <MaterialCommunityIcons name={item.icon} size={26} color={active ? colors.onPrimaryContainer : colors.onSurfaceVariant} />
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SurfaceCard({ children, style, accent }: PropsWithChildren<{ style?: ViewStyle; accent?: "primary" | "secondary" | "error" | "warning" }>) {
  return (
    <View style={[styles.card, style]}>
      {accent ? <View style={[styles.cardAccent, accent === "primary" && styles.accentPrimary, accent === "secondary" && styles.accentSecondary, accent === "error" && styles.accentError, accent === "warning" && styles.accentWarning]} /> : null}
      {children}
    </View>
  );
}

export function Pill({ label, tone = "neutral", icon }: { label: string; tone?: "primary" | "success" | "danger" | "warning" | "neutral"; icon?: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={[styles.pill, pillStyles[tone].wrap]}>
      {icon ? <MaterialCommunityIcons name={icon} size={15} color={pillStyles[tone].text.color} /> : null}
      <Text style={[styles.pillText, pillStyles[tone].text]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function MetricTile({ icon, label, value, tone = "primary" }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone?: "primary" | "success" | "danger" | "warning" }) {
  const color = tone === "success" ? colors.secondary : tone === "danger" ? colors.error : tone === "warning" ? "#ad8d5b" : colors.primary;
  return (
    <SurfaceCard style={styles.metricTile}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </SurfaceCard>
  );
}

export function InitialsAvatar({ label, size = 42, tone = "light" }: { label: string; size?: number; tone?: "dark" | "light" | "green" | "red" }) {
  const backgroundColor = tone === "dark" ? colors.primaryContainer : tone === "green" ? colors.secondary : tone === "red" ? colors.errorContainer : colors.primaryFixed;
  const color = tone === "dark" || tone === "green" ? colors.onPrimary : tone === "red" ? colors.onErrorContainer : colors.primary;
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

export function CircularScore({ value, label, color = colors.secondary, size = 68 }: { value: number; label: string; color?: string; size?: number }) {
  const stroke = 6;
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
  success: { wrap: { backgroundColor: "rgba(104,253,179,0.22)" }, text: { color: colors.secondary } },
  danger: { wrap: { backgroundColor: colors.errorContainer }, text: { color: colors.onErrorContainer } },
  warning: { wrap: { backgroundColor: "rgba(229,193,138,0.35)" }, text: { color: "#7a5800" } },
  neutral: { wrap: { backgroundColor: colors.surfaceContainerLow }, text: { color: colors.onSurfaceVariant } }
} as const;

const styles = StyleSheet.create({
  accentError: { backgroundColor: colors.error },
  accentPrimary: { backgroundColor: colors.primary },
  accentSecondary: { backgroundColor: colors.secondary },
  accentWarning: { backgroundColor: colors.tertiaryFixedDim },
  bottomNav: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerLow,
    borderTopColor: colors.outlineVariant,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    position: "absolute",
    right: 0
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    padding: spacing.lg
  },
  cardAccent: { bottom: 0, left: 0, position: "absolute", top: 0, width: 5 },
  chartBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, width: "100%" },
  chartBars: { alignItems: "flex-end", borderBottomColor: colors.surfaceContainerHigh, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, height: 180 },
  chartColumn: { alignItems: "center", flex: 1, gap: spacing.sm, height: "100%", justifyContent: "flex-end" },
  chartLabel: { ...typography.label, color: colors.onSurfaceVariant },
  chartLabelActive: { color: colors.primary },
  chartWrap: { gap: spacing.md },
  circularScore: { alignItems: "center", gap: spacing.sm },
  content: { gap: spacing.xl, padding: spacing.lg },
  contentBottom: { paddingBottom: spacing.xl },
  iconButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 },
  initialsAvatar: { alignItems: "center", justifyContent: "center" },
  initialsText: { ...typography.title },
  profileAvatar: { backgroundColor: colors.primaryFixed, resizeMode: "cover" },
  metricLabel: { ...typography.label, color: colors.onSurfaceVariant, textTransform: "uppercase" },
  metricTile: { flex: 1, gap: spacing.sm, minHeight: 112 },
  metricValue: { ...typography.headline },
  navItem: { alignItems: "center", borderRadius: radius.lg, gap: 2, minWidth: 64, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  navItemActive: { backgroundColor: colors.primaryContainer },
  navLabel: { ...typography.label, color: colors.onSurfaceVariant, letterSpacing: 0.4, textAlign: "center" },
  navLabelActive: { color: colors.onPrimaryContainer },
  notificationDot: { backgroundColor: colors.error, borderRadius: 5, height: 10, position: "absolute", right: 8, top: 7, width: 10 },
  pill: { alignItems: "center", alignSelf: "flex-start", borderRadius: radius.full, flexDirection: "row", gap: 5, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pillText: { ...typography.label },
  scoreCenter: { alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  scoreLabel: { ...typography.label, color: colors.onSurfaceVariant, textAlign: "center" },
  scoreNumber: { ...typography.title, color: colors.primary },
  sectionAction: { ...typography.label, color: colors.primary },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { ...typography.title, color: colors.primary },
  shell: { backgroundColor: colors.background, flex: 1 },
  topBar: { alignItems: "center", backgroundColor: colors.background, borderBottomColor: colors.outlineVariant, borderBottomWidth: 1, flexDirection: "row", height: 64, justifyContent: "space-between", paddingHorizontal: spacing.lg },
  topActions: { alignItems: "center", flexDirection: "row", justifyContent: "flex-end", width: 88 },
  topLead: { alignItems: "flex-start", height: 42, justifyContent: "center", width: 88 },
  topTitle: { ...typography.title, color: colors.primary, flex: 1, textAlign: "center" }
});
