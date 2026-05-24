import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { colors } from "@/shared/design/colors";

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.outlineVariant }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Panel", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Takvim", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-month-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Yoklama", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-check-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="development" options={{ title: "Gelişim", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-line" size={22} color={color} /> }} />
      <Tabs.Screen name="payments" options={{ title: "Ödeme", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="credit-card-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
