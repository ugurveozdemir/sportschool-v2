import { Redirect, Tabs } from "expo-router";

import { useSession } from "@/core/sessionProvider";
import { LoadingState } from "@/shared/components/LoadingState";

export default function AppTabs() {
  const { isReady, session } = useSession();

  if (!isReady) {
    return <LoadingState label="Oturum yükleniyor" />;
  }

  if (!session) {
    return <Redirect href="/role" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }
      }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="feed" />
      <Tabs.Screen name="announcements" options={{ href: null }} />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="trainings/[trainingId]" options={{ href: null }} />
      <Tabs.Screen name="reports/[trainingId]" options={{ href: null }} />
      <Tabs.Screen name="reports/[trainingId]/athletes/[athleteProfileId]" options={{ href: null }} />
      <Tabs.Screen name="attendance" />
      <Tabs.Screen name="athletes/[athleteProfileId]" options={{ href: null }} />
      <Tabs.Screen name="groups/[groupId]" options={{ href: null }} />
      <Tabs.Screen name="development" />
      <Tabs.Screen name="payments" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
