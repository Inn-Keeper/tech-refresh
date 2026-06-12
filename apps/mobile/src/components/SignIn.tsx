import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@/theme";

// Email + password with in-app account creation. No email delivery anywhere:
// requires "Confirm email" to be disabled in Supabase so signUp returns a
// live session immediately.
export function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (err) {
        setError(err.message);
      } else if (!data.session) {
        setNotice(
          t("auth.confirmEmailNotice")
        );
      }
    }
    setBusy(false);
  };

  const canSubmit = email.includes("@") && password.length >= (mode === "signup" ? 8 : 1);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", padding: 32 }}
    >
      <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 12 }}>⚡</Text>
      <Text style={{ color: colors.textBright, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 6 }}>
        {mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
      </Text>
      <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", marginBottom: 28 }}>
        {t("auth.tagline")}
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t("auth.emailPlaceholder")}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={mode === "signup" ? t("auth.newPasswordPlaceholder") : t("auth.passwordPlaceholder")}
        placeholderTextColor={colors.textFaint}
        secureTextEntry
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        style={[inputStyle, { marginTop: 10 }]}
      />

      <TouchableOpacity
        onPress={submit}
        disabled={busy || !canSubmit}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
          opacity: busy || !canSubmit ? 0.6 : 1,
        }}
      >
        <Text style={{ color: colors.onAccent, fontWeight: "600", textAlign: "center", fontSize: 15 }}>
          {busy ? "…" : mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
          setNotice(null);
        }}
        style={{ marginTop: 18 }}
      >
        <Text style={{ color: colors.textDim, fontSize: 13, textAlign: "center" }}>
          {mode === "signin" ? t("auth.switchToSignUp") : t("auth.switchToSignIn")}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: colors.dangerBright, fontSize: 13, textAlign: "center", marginTop: 16 }}>{error}</Text>
      )}
      {notice && (
        <Text style={{ color: colors.warningBright, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 19 }}>
          {notice}
        </Text>
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
