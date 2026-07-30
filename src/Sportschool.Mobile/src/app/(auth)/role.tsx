import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType
} from "react-native";

import type { LoginMode } from "@/shared/constants/roles";
import { colors } from "@/shared/design/colors";
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
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <Image resizeMode="contain" source={academyLogo} style={styles.watermark} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Image resizeMode="contain" source={academyLogo} style={styles.logo} />
          <Text adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={1} style={styles.academyLabel}>
            TÜRK OCAĞI LİMASOL ELİT FUTBOL AKADEMİSİ
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>KIBRIS&apos;IN{"\n"}BİR NUMARALISI</Text>
          <Text style={styles.subtitle}>
            Futbol eğitimi ile kişisel gelişim eğitimleri{"\n"}
            Kıbrıs&apos;ta ilk kez{"\n"}
            <Text style={styles.subtitleStrong}>Türk Ocağı Elit Futbol Akademisi&apos;nde.</Text>
          </Text>
        </View>

        <View style={styles.cards}>
          {roles.map((role) => (
            <Pressable
              accessibilityHint={`${role.title.toLocaleLowerCase("tr-TR")} giriş ekranını açar`}
              key={role.mode}
              onPress={() => router.push({ pathname: "/login", params: { mode: role.mode } })}
              style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
            >
              <Image resizeMode="cover" source={role.image} style={styles.rolePhoto} />
              <View style={styles.leftShade} />
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>{role.title}</Text>
              </View>
            </Pressable>
          ))}
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
  brand: {
    alignItems: "center",
    gap: 2
  },
  cards: {
    gap: spacing.sm
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  hero: {
    alignItems: "center",
    gap: spacing.md
  },
  leftShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primaryContainer,
    right: "45%"
  },
  logo: {
    height: 108,
    marginBottom: -6,
    width: 76
  },
  roleCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    height: 112,
    overflow: "hidden"
  },
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
  watermark: {
    height: 630,
    opacity: 0.06,
    position: "absolute",
    right: -145,
    top: 72,
    width: 420
  }
});
