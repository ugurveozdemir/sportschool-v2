import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

import { useSession } from "@/core/sessionProvider";
import { colors } from "@/shared/design/colors";
import { spacing } from "@/shared/design/spacing";
import { fontFamily } from "@/shared/design/typography";

const academyLogo = require("../../logo/sportschool_logo.png");
const INTRO_DURATION_MS = 2500;

export default function IndexRoute() {
  const { isReady, session } = useSession();
  const [introFinished, setIntroFinished] = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      duration: 450,
      toValue: 1,
      useNativeDriver: true
    }).start();

    const introTimer = setTimeout(() => setIntroFinished(true), INTRO_DURATION_MS);
    return () => clearTimeout(introTimer);
  }, [fadeIn]);

  if (isReady && introFinished) {
    return <Redirect href={session ? "/home" : "/role"} />;
  }

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.presentation,
          {
            opacity: fadeIn,
            transform: [
              {
                scale: fadeIn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1]
                })
              }
            ]
          }
        ]}
      >
        <Image
          accessibilityLabel="Türk Ocağı Elit Futbol Akademisi logosu"
          resizeMode="contain"
          source={academyLogo}
          style={styles.logo}
        />
        <Text style={styles.academyName}>TÜRK OCAĞI ELİT FUTBOL AKADEMİSİ</Text>
        <View style={styles.divider} />
        <Text style={styles.slogan}>KIBRIS&apos;IN BİR NUMARALI AKADEMİSİ</Text>
        <Text
          accessibilityLabel="İyi birey, iyi vatandaş, iyi futbolcu"
          style={styles.motto}
        >
          <Text style={styles.mottoLight}>İYİ </Text>
          <Text style={styles.mottoAccent}>BİREY</Text>
          {"\n"}
          <Text style={styles.mottoLight}>İYİ </Text>
          <Text style={styles.mottoAccent}>VATANDAŞ,</Text>
          {"\n"}
          <Text style={styles.mottoLight}>İYİ </Text>
          <Text style={styles.mottoAccent}>FUTBOLCU</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  academyName: {
    color: colors.onSurface,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 21,
    letterSpacing: 1.1,
    lineHeight: 27,
    maxWidth: 310,
    textAlign: "center"
  },
  divider: {
    backgroundColor: colors.primaryContainer,
    height: 2,
    marginVertical: spacing.sm,
    width: 56
  },
  logo: {
    height: 190,
    width: 135
  },
  motto: {
    color: colors.onSurface,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    letterSpacing: 1.25,
    lineHeight: 22,
    textAlign: "center"
  },
  mottoAccent: {
    color: colors.primaryContainer
  },
  mottoLight: {
    color: colors.onSurface
  },
  presentation: {
    alignItems: "center",
    gap: spacing.md
  },
  screen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl
  },
  slogan: {
    color: colors.primaryContainer,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    letterSpacing: 1.6,
    lineHeight: 21,
    textAlign: "center"
  }
});
