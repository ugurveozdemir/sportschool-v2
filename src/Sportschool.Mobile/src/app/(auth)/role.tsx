import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { AkademiLogo } from "@/shared/components/AkademiLogo";
import { colors } from "@/shared/design/colors";
import { radius, spacing } from "@/shared/design/spacing";
import { typography } from "@/shared/design/typography";
import type { LoginMode } from "@/shared/constants/roles";

const roles: { mode: LoginMode; title: string; image: string }[] = [
  {
    mode: "Athlete",
    title: "Sporcular",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB52OOTYRV0JoUTZ8mOO6zFzOknZ8eKejQVms7gHiiUSAvAJR-TooJbcMD_V19RgRFxaUhQJchjE2mYRFeefIxT5A5aHkhqGkTNiaw3mhQpe5wCv1QFzffXnC-ZrmEI5_tuemmQoN-0o1j-TuY73WuBFeTAq_snkKUhJF2tYIBrWWp0KZaqTO_wvsu58QptibFQ1gsFHkg23_sNsxXlH4lLDY2iF6fFGzfQe3q8LhLcvzI_R04AmmoYfM9I_ps0YdgSck__Prtg9AJx"
  },
  {
    mode: "Coach",
    title: "Antrenörler",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCPakDmkmkJ82Yn4txQUZyVhF9IaFOICjlKaa7BfxniGj4sIX83xkFy7kyfUy20U7KJIswm2_z6Ds7yDVap1cSfDCRUHXKk45LHDZPA-Tcc3UuLBm4FpXPE9qI3x9BWb76sfcZqrHPdxH4Rj1mJfR2D59I7nSHnU7p1MXfdFkSiB-dZQ-H-2j7A6jSbCa822-bqUfWEunp4haIHQJ86CgTsWBMHw_W6l1aI6V7g_TE3u5AyzyRyRnf2sA8cpDR1zA1x1zUoUh2Jso1_"
  },
  {
    mode: "Parent",
    title: "Veliler",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCC-MdDf86Qlipq1ie3hzVmw5MPn49QoQkP9t7Y_6GuPwMges04SabeZpZFSdWjt3bzFFa7nlmGcIlFt9jEpvRD8nWIyXDIEvHG_jCatZNiBSuvKhhQG_zD0g66vjw8NUfKfDrBTbqJASX9sZQVYF8mm0Ky9BcQl4XPN02HkG-Hoeq5yxk2pIcmoZ32Mt7e0wtfZiuFdsFng7_jJHWTAdknjyxXMGX1WyAWQrVxoO_5z0sLhV-k-4ZTARgyX7n5qxGQxCUmH3p2ybSX"
  }
];

export default function RoleScreen() {
  const [selectedRole, setSelectedRole] = useState<LoginMode>("Athlete");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.patternLogo}>
        <AkademiLogo size={280} />
      </View>
      <View style={styles.header}>
        <View style={styles.logoBubble}>
          <AkademiLogo size={84} />
        </View>
        <Text style={styles.country}>Türkiye</Text>
        <Text style={styles.title}>Türkiye'nin Bir Numaralı{`\n`}Akademisi</Text>
        <Text style={styles.subtitle}>Futbol eğitimi ve kişisel gelişim antrenmanları Türkiye'de ilk defa Akademi Pro çatısı altında...</Text>
      </View>

      <View style={styles.cards}>
        {roles.map((role) => {
          const selected = selectedRole === role.mode;
          return (
            <Pressable key={role.mode} onPress={() => setSelectedRole(role.mode)} style={({ pressed }) => [styles.roleCard, selected && styles.roleCardSelected, pressed && styles.pressed]}>
              <ImageBackground source={{ uri: role.image }} resizeMode="cover" style={styles.roleImage} imageStyle={styles.roleImageRadius}>
                <View style={styles.roleOverlay} />
                <Text style={styles.roleTitle}>{role.title}</Text>
              </ImageBackground>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => router.push({ pathname: "/login", params: { mode: selectedRole } })} style={styles.footer}>
        <Text style={styles.footerText}>Devam Et</Text>
        <MaterialCommunityIcons name="arrow-right" size={30} color={colors.onPrimary} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cards: { gap: spacing.lg, paddingHorizontal: spacing.lg },
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
