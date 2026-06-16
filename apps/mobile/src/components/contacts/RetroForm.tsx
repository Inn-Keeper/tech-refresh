import { useState } from "react";
import { TextInput, View } from "react-native";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@/theme";
import { Button, Field, inputStyle, multilineStyle } from "@/components/ui";

export const EMPTY_RETRO = { round: "", questions: "", wentWell: "", toImprove: "" };

type RetroFormProps = { onSave: (retro: typeof EMPTY_RETRO) => void; onCancel: () => void };

export function RetroForm({ onSave, onCancel }: RetroFormProps) {
  const [form, setForm] = useState({ ...EMPTY_RETRO });
  const set = (field: keyof typeof EMPTY_RETRO) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  return (
    <View
      style={{
        padding: 12,
        backgroundColor: colors.well,
        borderWidth: 1,
        borderColor: `${colors.accent}60`,
        borderRadius: 10,
        gap: 8,
      }}
    >
      <Field label={t("retro.round")}>
        <TextInput
          style={inputStyle}
          value={form.round}
          onChangeText={set("round")}
          placeholder={t("retro.roundPlaceholder")}
          placeholderTextColor={colors.textFaint}
          autoFocus
        />
      </Field>
      <Field label={t("retro.questions")}>
        <TextInput style={[inputStyle, multilineStyle]} value={form.questions} onChangeText={set("questions")} multiline />
      </Field>
      <Field label={t("retro.wentWell")}>
        <TextInput style={[inputStyle, multilineStyle]} value={form.wentWell} onChangeText={set("wentWell")} multiline />
      </Field>
      <Field label={t("retro.toImprove")}>
        <TextInput style={[inputStyle, multilineStyle]} value={form.toImprove} onChangeText={set("toImprove")} multiline />
      </Field>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onCancel} />
        <Button label={t("contacts.saveRetro")} onPress={() => onSave(form)} />
      </View>
    </View>
  );
}
