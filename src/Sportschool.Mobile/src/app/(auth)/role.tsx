import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { radius, spacing } from "@/shared/design/spacing";
import { fontFamily, typography } from "@/shared/design/typography";

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
      <StatusBar style="dark" />
      <Image resizeMode="contain" source={academyLogo} style={styles.watermark} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Image resizeMode="contain" source={academyLogo} style={styles.logo} />
          <Text style={styles.academyLabel}>FUTBOL AKADEMİSİ</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.title}>KIBRIS&apos;IN{"\n"}EN İYİ FUTBOL AKADEMİSİ</Text>
          <Text style={styles.subtitle}>
            Futbol eğitimi ve kişisel gelişim{"\n"}
            <Text style={styles.subtitleStrong}>Türk Ocağı Limasol&apos;da.</Text>
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
              <View style={styles.photoTint} />
              <View style={styles.middleShade} />
              <View style={styles.leftShade} />
              <View style={styles.roleCopy}>
                <Text style={styles.roleTitle}>{role.title}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.version}>0.1.0</Text>
        <View style={styles.footerInstruction}>
          <Text style={styles.footerText}>Rolünü seç</Text>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.footerAccent} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  academyLabel: {
    color: "#171719",
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
  footer: {
    alignItems: "center",
    backgroundColor: "#082F55",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.lg
  },
  footerAccent: {
    backgroundColor: "#C49A33",
    height: 7
  },
  footerInstruction: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  footerText: {
    ...typography.bodyLarge,
    color: "#FFFFFF"
  },
  hero: {
    alignItems: "center",
    gap: spacing.md
  },
  leftShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#083B68",
    right: "45%"
  },
  logo: {
    height: 108,
    marginBottom: -6,
    width: 76
  },
  middleShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,59,104,0.72)",
    right: "24%"
  },
  photoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3,37,67,0.22)"
  },
  roleCard: {
    backgroundColor: "#083B68",
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
    color: "#FFFFFF",
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 23,
    letterSpacing: -0.5
  },
  safeArea: {
    backgroundColor: "#F5F4F0",
    flex: 1
  },
  subtitle: {
    color: "#26262A",
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  },
  subtitleStrong: {
    fontFamily: fontFamily.bold
  },
  title: {
    color: "#111113",
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 29,
    letterSpacing: -1.1,
    lineHeight: 32,
    textAlign: "center"
  },
  version: {
    ...typography.bodyLarge,
    color: "#FFFFFF"
  },
  watermark: {
    height: 630,
    opacity: 0.035,
    position: "absolute",
    right: -145,
    top: 72,
    width: 420
  }
});
