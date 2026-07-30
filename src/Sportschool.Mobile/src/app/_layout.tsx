import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import {
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold
} from "@expo-google-fonts/hanken-grotesk";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/core/queryClient";
import { AthleteSelectionProvider } from "@/core/athleteSelectionProvider";
import { SessionProvider } from "@/core/sessionProvider";
import { colors } from "@/shared/design/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppDataRefresher />
        <SessionProvider>
          <AthleteSelectionProvider>
            <StatusBar style="light" backgroundColor={colors.background} />
            <Stack screenOptions={{ headerShown: false }} />
          </AthleteSelectionProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function AppDataRefresher() {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") {
        return;
      }

      void Promise.all([
        queryClient.refetchQueries({ queryKey: ["me", "profile"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["me", "athletes"], type: "active" }),
        queryClient.refetchQueries({ queryKey: ["feed"], type: "active" })
      ]);
    });

    return () => subscription.remove();
  }, []);

  return null;
}
