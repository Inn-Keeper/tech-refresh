import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme";

/** Tab screen root: app background + status-bar inset (native tabs render no header). */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>{children}</View>;
}

export const inputStyle = {
  backgroundColor: colors.surfaceAlt,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  padding: 10,
  color: colors.text,
  fontSize: 13,
} as const;

export const multilineStyle = { minHeight: 70, textAlignVertical: "top" } as const;

type PillProps = { label: string; active: boolean; activeColor?: string; onPress: () => void };

/** Selectable chip — category filters, mode toggles, competency/status pickers. */
export function Pill({ label, active, activeColor = colors.accent, onPress }: PillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: active ? activeColor : colors.surface,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: active ? "#fff" : colors.textDim }}>{label}</Text>
    </TouchableOpacity>
  );
}

type BadgeProps = { label: string; color: string };

/** Small colored label — statuses, competencies. */
export function Badge({ label, color }: BadgeProps) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: `${color}20`, borderRadius: 20 }}>
      <Text style={{ color, fontSize: 10, fontWeight: "700", letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

type MiniButtonProps = { label: string; color: string; onPress: () => void };

/** Compact outlined action — edit/delete/advance rows on cards. */
export function MiniButton({ label, color, onPress }: MiniButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${color}50`, borderRadius: 8 }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

type ButtonProps = { label: string; onPress: () => void; variant?: "primary" | "ghost"; disabled?: boolean };

/** Form-level action button. */
export function Button({ label, onPress, variant = "primary", disabled = false }: ButtonProps) {
  const primary = variant === "primary";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 8,
        backgroundColor: primary ? colors.accent : "transparent",
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: primary ? "#fff" : colors.textDim, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

type FieldProps = { label: string; children: ReactNode };

/** Labeled form field. */
export function Field({ label, children }: FieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textFaint, letterSpacing: 0.3 }}>{label}</Text>
      {children}
    </View>
  );
}

type SectionProps = { label: string; text: string };

/** Labeled read-only text block — STAR sections, retro fields. */
export function Section({ label, text }: SectionProps) {
  if (!text) return null;
  return (
    <View>
      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.textFaint, letterSpacing: 0.8, marginBottom: 2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 19, color: "#cbd5e1" }}>{text}</Text>
    </View>
  );
}
