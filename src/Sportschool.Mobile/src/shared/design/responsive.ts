import { useWindowDimensions } from "react-native";

const compactPhoneMaxWidth = 375;
const compactPhoneMaxHeight = 700;
const tabletMinWidth = 768;

export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();

  return {
    isCompact: width <= compactPhoneMaxWidth || height <= compactPhoneMaxHeight,
    isTablet: width >= tabletMinWidth
  };
}
