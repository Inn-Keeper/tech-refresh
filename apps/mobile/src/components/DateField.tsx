import { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { formatDDMMYYYY, parseDDMMYYYY, todayDDMMYYYY } from "@tech-refresh/core/contacts";
import { colors } from "@/theme";
import { Field, MiniButton, inputStyle } from "@/components/ui";

type Props = {
  label: string;
  /** DD-MM-YYYY, or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Optional fields render a Clear action; required ones don't. */
  clearable?: boolean;
};

/**
 * Native date picker bound to the app's DD-MM-YYYY string format.
 * Empty values show a "Set date" affordance that defaults to today;
 * iOS then renders the compact calendar control, Android a dialog.
 */
export function DateField({ label, value, onChange, clearable = false }: Props) {
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);
  const date = parseDDMMYYYY(value) ?? new Date();

  const handlePicked = (event: DateTimePickerEvent, picked?: Date) => {
    setAndroidPickerOpen(false);
    if (event.type !== "dismissed" && picked) onChange(formatDDMMYYYY(picked));
  };

  if (!value) {
    return (
      <Field label={label}>
        <TouchableOpacity onPress={() => onChange(todayDDMMYYYY())} style={[inputStyle, { alignSelf: "flex-start" }]}>
          <Text style={{ color: colors.textDim, fontSize: 13 }}>📅 Set date (today)</Text>
        </TouchableOpacity>
      </Field>
    );
  }

  return (
    <Field label={label}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {Platform.OS === "ios" ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            themeVariant="dark"
            accentColor={colors.accent}
            onChange={handlePicked}
          />
        ) : (
          <TouchableOpacity onPress={() => setAndroidPickerOpen(true)} style={inputStyle}>
            <Text style={{ color: colors.text, fontSize: 13 }}>📅 {value}</Text>
          </TouchableOpacity>
        )}
        {clearable && <MiniButton label="Clear" color={colors.textFaint} onPress={() => onChange("")} />}
      </View>
      {androidPickerOpen && <DateTimePicker value={date} mode="date" onChange={handlePicked} />}
    </Field>
  );
}
