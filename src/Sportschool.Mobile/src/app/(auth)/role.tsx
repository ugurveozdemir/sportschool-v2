import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { LoginMode } from "@/shared/constants/roles";
import { colors } from "@/shared/design/colors";
import { useResponsiveLayout } from "@/shared/design/responsive";
import { radius, spacing } from "@/shared/design/spacing";
import { fontFamily } from "@/shared/design/typography";

const academyLogo = require("../../../logo/sportschool_logo.png");

const roles: {
  mode: LoginMode;
  title: string;
  image: ImageSourcePropType;
}[] = [
  {
    mode: "Athlete",
    title: "SPORCULAR",
    image: require("../../assets/role-athletes.png")
  },
  {
    mode: "Coach",
    title: "ANTRENÖRLER",
    image: require("../../assets/role-coaches.png")
  },
  {
    mode: "Parent",
    title: "EBEVEYNLER",
    image: require("../../assets/role-parents.png")
  }
];

export default function RoleScreen() {
  const { isCompact } = useResponsiveLayout();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <Image resizeMode="contain" source={academyLogo} style={styles.watermark} />

      <ScrollView contentContainerStyle={[styles.scrollContent, isCompact && styles.scrollContentCompact]} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, isCompact && styles.contentCompact]}>
          <View style={styles.brand}>
            <Image resizeMode="contain" source={academyLogo} style={[styles.logo, isCompact && styles.logoCompact]} />
            <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={[styles.academyLabel, isCompact && styles.academyLabelCompact]}>
              TÜRK OCAĞI LİMASOL ELİT FUTBOL AKADEMİSİ
            </Text>
          </View>

          <View style={[styles.hero, isCompact && styles.heroCompact]}>
            <Text style={[styles.title, isCompact && styles.titleCompact]}>KIBRIS&apos;IN{"\n"}BİR NUMARALI AKADEMİSİ</Text>
            <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
              Futbol eğitimi ile kişisel gelişim eğitimleri{"\n"}
              Kıbrıs&apos;ta ilk kez{"\n"}
              <Text style={styles.subtitleStrong}>Türk Ocağı Elit Futbol Akademisi&apos;nde.</Text>
            </Text>
          </View>

          <View style={[styles.cards, isCompact && styles.cardsCompact]}>
            {roles.map((role) => (
              <Pressable
                accessibilityHint={`${role.title.toLocaleLowerCase("tr-TR")} giriş ekranını açar`}
                key={role.mode}
                onPress={() => router.push({ pathname: "/login", params: { mode: role.mode } })}
                style={({ pressed }) => [styles.roleCard, isCompact && styles.roleCardCompact, pressed && styles.roleCardPressed]}
              >
                <Image resizeMode="cover" source={role.image} style={styles.rolePhoto} />
                <View style={styles.leftShade} />
                <View style={[styles.roleCopy, isCompact && styles.roleCopyCompact]}>
                  <Text style={[styles.roleTitle, isCompact && styles.roleTitleCompact]}>{role.title}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  academyLabel: {
    color: colors.primaryContainer,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 12,
    letterSpacing: 1.5
  },
  academyLabelCompact: { fontSize: 10, letterSpacing: 1.1 },
  brand: {
    alignItems: "center",
    gap: 2
  },
  cards: {
    gap: spacing.sm
  },
  cardsCompact: { gap: 6 },
  content: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: 520,
    width: "100%"
  },
  contentCompact: { gap: spacing.md },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  scrollContentCompact: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  hero: {
    alignItems: "center",
    gap: spacing.md
  },
  heroCompact: { gap: spacing.sm },
  leftShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryContainer,
    right: "45%"
  },
  logo: {
    height: 256,
    marginBottom: -6,
    width: 180
  },
  logoCompact: { height: 112, marginBottom: -4, width: 79 },
  roleCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    height: 112,
    overflow: "hidden"
  },
  roleCardCompact: { height: 82 },
  roleCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  },
  roleCopy: {
    bottom: 0,
    justifyContent: "center",
    left: 0,
    paddingHorizontal: spacing.lg,
    position: "absolute",
    top: 0,
    width: "55%"
  },
  roleCopyCompact: { paddingHorizontal: spacing.md },
  rolePhoto: {
    bottom: 0,
    height: "100%",
    position: "absolute",
    right: 0,
    width: "68%"
  },
  roleTitle: {
    color: colors.onPrimary,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 23,
    letterSpacing: -0.5
  },
  roleTitleCompact: { fontSize: 19, letterSpacing: -0.3, lineHeight: 23 },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  subtitle: {
    color: colors.onSurface,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  subtitleCompact: { fontSize: 13, lineHeight: 18 },
  subtitleStrong: {
    color: colors.primaryContainer,
    fontFamily: fontFamily.bold
  },
  title: {
    color: colors.onSurface,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 29,
    letterSpacing: -1.1,
    lineHeight: 32,
    textAlign: "center"
  },
  titleCompact: { fontSize: 24, letterSpacing: -0.7, lineHeight: 27 },
  watermark: {
    height: 630,
    opacity: 0.06,
    position: "absolute",
    right: -145,
    top: 72,
    width: 420
  }
});
