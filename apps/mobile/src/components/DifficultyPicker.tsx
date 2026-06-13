import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { DIFFICULTIES } from "@tech-refresh/core/difficulty";
import { colors } from "@/theme";
import { BrandIcon } from "@/components/BrandIcon";

type Props = {
  onPick: (difficulty: string) => void;
  onCancel: () => void;
  loadingKey: string | null;
  error: string | null;
};

// Sassy tier selector shown before a drill. Each tier is colored by its token
// and shows the XP it pays per correct answer, so harder feels worth it.
export function DifficultyPicker({ onPick, onCancel, loadingKey, error }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textBright }}>Pick your pain</Text>
        <TouchableOpacity onPress={onCancel}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textFaint }}>Cancel</Text>
            <BrandIcon name="close" color={colors.textFaint} size={11} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 8 }}>
        {DIFFICULTIES.map((d) => {
          const loading = loadingKey === d.key;
          const disabled = loadingKey !== null;
          return (
            <TouchableOpacity
              key={d.key}
              onPress={() => onPick(d.key)}
              disabled={disabled}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: `${d.color}1A`,
                borderWidth: 1,
                borderColor: `${d.color}60`,
                opacity: disabled && !loading ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 20 }}>{d.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: d.color }}>{d.label}</Text>
                <Text style={{ fontSize: 11, color: colors.textDim }}>{d.blurb}</Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={d.color} />
              ) : (
                <Text style={{ fontSize: 11, fontWeight: "700", color: d.color }}>+{d.xp} XP</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={{ fontSize: 11, color: colors.warning }}>{error}</Text>}
    </Animated.View>
  );
}
