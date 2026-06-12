import type { ReactNode } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, font, radius, space } from "@/theme";

/**
 * Tab screen root: app background + safe-area insets (native tabs render no
 * header). Left/right matter in landscape, where the sensor housing sits
 * on the side of the screen.
 */
export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {children}
    </View>
  );
}

export const inputStyle = {
  backgroundColor: colors.well,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.sm,
  padding: space.md,
  color: colors.text,
  fontSize: font.size.body,
} as const;

export const multilineStyle = { minHeight: 70, textAlignVertical: "top" } as const;

type PillProps = { label: string; active: boolean; activeColor?: string; onPress: () => void };

/** Selectable chip — category filters, mode toggles, competency/status pickers. */
export function Pill({ label, active, activeColor = colors.accent, onPress }: PillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? activeColor : colors.surface,
      }}
    >
      <Text style={{ fontSize: font.size.body, fontWeight: "600", color: active ? colors.onAccent : colors.textDim }}>{label}</Text>
    </TouchableOpacity>
  );
}

type BadgeProps = { label: string; color: string };

/** Small colored label — statuses, competencies. */
export function Badge({ label, color }: BadgeProps) {
  return (
    <View style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, backgroundColor: `${color}20`, borderRadius: radius.pill }}>
      <Text style={{ color, fontSize: font.size.caption, fontWeight: "700", letterSpacing: 0.4 }}>{label.toUpperCase()}</Text>
    </View>
  );
}

type MiniButtonProps = { label: string; color: string; onPress: () => void };

/** Compact outlined action — edit/delete/advance rows on cards. */
export function MiniButton({ label, color, onPress }: MiniButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: space.sm, paddingVertical: space.xs, borderWidth: 1, borderColor: `${color}50`, borderRadius: radius.sm }}
    >
      <Text style={{ color, fontSize: font.size.label, fontWeight: "600" }}>{label}</Text>
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
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderRadius: radius.sm,
        backgroundColor: primary ? colors.accent : "transparent",
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: primary ? colors.onAccent : colors.textDim, fontSize: font.size.body, fontWeight: "600" }}>{label}</Text>
    </TouchableOpacity>
  );
}

type FieldProps = { label: string; children: ReactNode };

/** Labeled form field. */
export function Field({ label, children }: FieldProps) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={{ fontSize: font.size.label, fontWeight: "600", color: colors.textFaint, letterSpacing: 0.3 }}>{label}</Text>
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
      <Text style={{ fontSize: font.size.caption, fontWeight: "700", color: colors.textFaint, letterSpacing: 0.8, marginBottom: 2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: font.size.body, lineHeight: 19, color: colors.text }}>{text}</Text>
    </View>
  );
}
