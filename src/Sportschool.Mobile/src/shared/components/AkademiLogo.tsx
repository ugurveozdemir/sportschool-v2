import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/shared/design/colors";

export function AkademiLogo({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Path d="M64 7L19 27V63C19 91 38 116 64 124C90 116 109 91 109 63V27L64 7Z" fill={colors.surfaceContainer} stroke={colors.primaryContainer} strokeWidth="5" />
      <Circle cx="64" cy="64" r="31" fill={colors.primaryContainer} />
      <Path d="M64 43V85M43 64H85M49 49L79 79M79 49L49 79" stroke={colors.onPrimary} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}
