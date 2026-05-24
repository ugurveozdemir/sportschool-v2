import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/shared/design/colors";

export function AkademiLogo({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Path d="M64 8L20 28V64C20 91.2 38.8 116.4 64 124C89.2 116.4 108 91.2 108 64V28L64 8Z" fill={colors.primaryContainer} />
      <Circle cx="64" cy="66" r="30" fill="#2DCE89" />
      <Path d="M64 46V86M44 66H84M50 52L78 80M78 52L50 80" stroke={colors.primaryContainer} strokeWidth="4" strokeLinecap="round" />
    </Svg>
  );
}
