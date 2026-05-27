import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { AkademiLogo } from "@/shared/components/AkademiLogo";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import type { LoginMode } from "@/shared/constants/roles";

const roles: { mode: LoginMode; title: string; image: ImageSourcePropType }[] = [
  {
    mode: "Athlete",
    title: "Sporcular",
    image: require("../../assets/role-athletes.png")
  },
  {
    mode: "Coach",
    title: "Antrenörler",
    image: require("../../assets/role-coaches.png")
  },
  {
    mode: "Parent",
    title: "Veliler",
    image: require("../../assets/role-parents.png")
  }
];

export default function RoleScreen() {
  const [selectedRole, setSelectedRole] = useState<LoginMode>("Athlete");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.patternLogo}>
        <AkademiLogo size={280} />
      </View>
      <ScrollView alwaysBounceVertical contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.logoBubble}>
            <AkademiLogo size={84} />
          </View>
          <Text style={styles.country}>Türkiye</Text>
          <Text style={styles.title}>{`Türkiye'nin Bir Numaralı\nAkademisi`}</Text>
          <Text style={styles.subtitle}>{"Futbol eğitimi ve kişisel gelişim antrenmanları Türkiye'de ilk defa Akademi Pro çatısı altında..."}</Text>
        </View>

        <View style={styles.cards}>
          {roles.map((role) => {
            const selected = selectedRole === role.mode;
            return (
              <Pressable key={role.mode} onPress={() => setSelectedRole(role.mode)} style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.pressed]}>
                <ImageBackground source={role.image} resizeMode="cover" style={styles.roleImage} imageStyle={styles.roleImageRadius}>
                  <View style={styles.roleOverlay} />
                  <Text style={styles.roleTitle}>{role.title}</Text>
                </ImageBackground>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Pressable onPress={() => router.push({ pathname: "/login", params: { mode: selectedRole } })} style={styles.footer}>
        <Text style={styles.footerText}>Devam Et</Text>
        <MaterialCommunityIcons name="arrow-right" size={30} color={colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.lg, paddingHorizontal: spacing.lg },
  content: { flexGrow: 1, paddingBottom: spacing.xl },
  country: { ...typography.label, color: colors.primary, textAlign: "center", textTransform: "uppercase" },
  footer: { alignItems: "center", backgroundColor: colors.primary, flexDirection: "row", gap: spacing.sm, height: 72, justifyContent: "flex-end", marginTop: "auto", paddingHorizontal: spacing.xl },
  footerText: { ...typography.bodyLarge, color: colors.onPrimary, fontFamily: "Inter_600SemiBold" },
  header: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logoBubble: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.full, height: 112, justifyContent: "center", width: 112 },
  patternLogo: { opacity: 0.04, position: "absolute", top: 145 },
  pressed: { transform: [{ scale: 0.98 }] },
  roleCard: { borderRadius: radius.lg, height: 132, overflow: "hidden" },
  roleCardSelected: { shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { height: 4, width: 0 } },
  roleImage: { flex: 1, justifyContent: "center" },
  roleImageRadius: { borderRadius: radius.lg },
  roleOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(3,22,50,0.52)" },
  roleTitle: { ...typography.headline, color: colors.onPrimary, fontFamily: "Inter_700Bold", letterSpacing: 5, paddingLeft: spacing.xl, textTransform: "uppercase" },
  safeArea: { backgroundColor: colors.background, flex: 1 },
  subtitle: { ...typography.bodyLarge, color: colors.onSurfaceVariant, maxWidth: 330, textAlign: "center" },
  title: { ...typography.headline, color: colors.primary, fontFamily: "Inter_700Bold", textAlign: "center", textTransform: "uppercase" }
});
