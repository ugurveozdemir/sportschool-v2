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

import { AcademyLogoAvatar } from "@/shared/components/AcademyLogoAvatar";
import { brand } from "@/shared/constants/brand";
import type { LoginMode } from "@/shared/constants/roles";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { fontFamily, typography } from "@/shared/design/typography";

const roles: {
  mode: LoginMode;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
}[] = [
  {
    mode: "Athlete",
    title: "Sporcu",
    subtitle: "Antrenman ve gelişim paneli",
    image: require("../../assets/role-athletes.png")
  },
  {
    mode: "Coach",
    title: "Antrenör",
    subtitle: "Takım ve akademi yönetimi",
    image: require("../../assets/role-coaches.png")
  },
  {
    mode: "Parent",
    title: "Veli",
    subtitle: "Sporcu takibi ve ödemeler",
    image: require("../../assets/role-parents.png")
  }
];

export default function RoleScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.watermark}>
        <AcademyLogoAvatar size={300} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AcademyLogoAvatar size={88} />
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
                  <AcademyLogoAvatar size={44} />
                  <View style={styles.roleText}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={26} color={colors.primary} />
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
    fontSize: 25,
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
    height: 124,
    overflow: "hidden"
  },
  roleCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
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
