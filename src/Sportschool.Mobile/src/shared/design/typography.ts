export const fontFamily = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  headingSemibold: "HankenGrotesk_600SemiBold",
  headingBold: "HankenGrotesk_700Bold",
  headingExtraBold: "HankenGrotesk_800ExtraBold"
} as const;

export const typography = {
  display: { fontFamily: fontFamily.headingExtraBold, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headline: { fontFamily: fontFamily.headingBold, fontSize: 24, lineHeight: 32 },
  title: { fontFamily: fontFamily.headingSemibold, fontSize: 20, lineHeight: 28 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 }
} as const;
