import { Image, StyleSheet, View } from "react-native";

import { colors } from "@/shared/design/colors";

const academyLogo = require("../../../logo/sportschool_logo.png");

export function AcademyLogoAvatar({ size = 48 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="Türk Ocağı Elit Akademi logosu"
      style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Image
        resizeMode="contain"
        source={academyLogo}
        style={{ width: size, height: size * 1.5 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surfaceContainerHigh,
    borderColor: colors.primary,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden"
  }
});
