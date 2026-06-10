import { Text, View } from "react-native";
import { colors } from "@/theme";

export default function Placeholder() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 }}>
      <Text style={{ fontSize: 36 }}>🤝</Text>
      <Text style={{ color: colors.textBright, fontSize: 17, fontWeight: "700" }}>Contacts</Text>
      <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center" }}>Coming in Phase 3. Use the web app meanwhile.</Text>
    </View>
  );
}
