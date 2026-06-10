import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/theme";

const tabIcon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
  };

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#13161f" },
        headerTitleStyle: { color: colors.textBright, fontSize: 16, fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: "#13161f", borderTopColor: colors.surface },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Prep", headerTitle: "⚡ Interview Prep", tabBarIcon: tabIcon("📚") }} />
      <Tabs.Screen name="stories" options={{ title: "Stories", tabBarIcon: tabIcon("⭐") }} />
      <Tabs.Screen name="board" options={{ title: "Arch Board", tabBarIcon: tabIcon("🧩") }} />
      <Tabs.Screen name="contacts" options={{ title: "Contacts", tabBarIcon: tabIcon("🤝") }} />
    </Tabs>
  );
}
