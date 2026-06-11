import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

// Plain email + password: no email delivery, no SMTP, sessions persist
// in AsyncStorage so this screen appears roughly once per device.
export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 32 }}
    >
      <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚡</Text>
      <Text style={{ color: colors.textBright, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 6 }}>
        Interview Prep
      </Text>
      <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", marginBottom: 28 }}>
        Your pipeline and scores live behind your account.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="you@email.com"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        placeholderTextColor={colors.textFaint}
        secureTextEntry
        autoComplete="current-password"
        style={[inputStyle, { marginTop: 10 }]}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={busy || !email.includes("@") || !password}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center", fontSize: 15 }}>
          {busy ? "…" : "Sign in"}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: "#fca5a5", fontSize: 13, textAlign: "center", marginTop: 16 }}>{error}</Text>
      )}
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  padding: 14,
  color: colors.text,
  fontSize: 15,
} as const;
