export const fontFamily = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  headingSemibold: "HankenGrotesk_600SemiBold",
  headingBold: "HankenGrotesk_700Bold",
  headingExtraBold: "HankenGrotesk_800ExtraBold"
} as const;

export const typography = {
  display: { fontFamily: fontFamily.headingExtraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  headline: { fontFamily: fontFamily.headingBold, fontSize: 20, lineHeight: 26 },
  title: { fontFamily: fontFamily.headingSemibold, fontSize: 17, lineHeight: 23 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fontFamily.bold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 }
} as const;
