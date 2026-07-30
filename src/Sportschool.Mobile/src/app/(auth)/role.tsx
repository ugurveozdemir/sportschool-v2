import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType
} from "react-native";

import { AkademiLogo } from "@/shared/components/AkademiLogo";
import { brand } from "@/shared/constants/brand";
import type { LoginMode } from "@/shared/constants/roles";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { fontFamily, typography } from "@/shared/design/typography";

const roles: {
  mode: LoginMode;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  image: ImageSourcePropType;
}[] = [
  {
    mode: "Athlete",
    title: "Sporcu",
    subtitle: "Antrenman ve gelişim paneli",
    icon: "run",
    image: require("../../assets/role-athletes.png")
  },
  {
    mode: "Coach",
    title: "Antrenör",
    subtitle: "Takım ve akademi yönetimi",
    icon: "whistle-outline",
    image: require("../../assets/role-coaches.png")
  },
  {
    mode: "Parent",
    title: "Veli",
    subtitle: "Sporcu takibi ve ödemeler",
    icon: "account-heart-outline",
    image: require("../../assets/role-parents.png")
  }
];

export default function RoleScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.watermark}>
        <AkademiLogo size={360} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AkademiLogo size={104} />
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.title}>Giriş rolünü seç</Text>
          <Text style={styles.subtitle}>Devam etmek için hesabına uygun alanı seç.</Text>
        </View>

        <View style={styles.cards}>
          {roles.map((role) => (
            <Pressable
              key={role.mode}
              onPress={() => router.push({ pathname: "/login", params: { mode: role.mode } })}
              style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
            >
              <ImageBackground source={role.image} resizeMode="cover" style={styles.roleImage} imageStyle={styles.roleImageRadius}>
                <View style={styles.roleOverlay} />
                <View style={styles.roleCopy}>
                  <View style={styles.roleIcon}>
                    <MaterialCommunityIcons name={role.icon} size={27} color={colors.onPrimary} />
                  </View>
                  <View style={styles.roleText}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={30} color={colors.primary} />
                </View>
              </ImageBackground>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brandName: {
    color: colors.primary,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 29,
    letterSpacing: -0.5,
    textAlign: "center"
  },
  cards: { gap: spacing.md },
  content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl },
  header: { alignItems: "center", gap: spacing.sm, paddingBottom: spacing.xl, paddingTop: spacing.lg },
  pressed: { transform: [{ scale: 0.98 }] },
  roleCard: {
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    height: 142,
    overflow: "hidden"
  },
  roleCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  roleIcon: {
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.full,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  roleImage: { flex: 1 },
  roleImageRadius: { borderRadius: radius.lg },
  roleOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(14,14,17,0.78)" },
  roleSubtitle: { ...typography.body, color: colors.onSurfaceVariant },
  roleText: { flex: 1, gap: spacing.xs },
  roleTitle: { ...typography.headline, color: colors.onSurface },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, textAlign: "center" },
  title: { ...typography.headline, color: colors.onSurface, marginTop: spacing.sm, textAlign: "center" },
  watermark: { opacity: 0.025, position: "absolute", right: -110, top: 70 }
});
