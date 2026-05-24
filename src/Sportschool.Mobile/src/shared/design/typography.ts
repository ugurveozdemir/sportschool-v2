export const fontFamily = {
  regular: "Inter_400Regular",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold"
} as const;

export const typography = {
  display: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 36 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32 },
  title: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 }
} as const;
