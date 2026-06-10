import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme";

// Email OTP flow: magic links don't deep-link cleanly into Expo Go, so the
// phone signs in with the 6-digit code from the same email.
export function SignIn() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setBusy(false);
    if (err) setError(err.message);
    else setStage("code");
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
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
      <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", marginBottom: 28, lineHeight: 19 }}>
        {stage === "email"
          ? "Sign in with your email — we'll send a 6-digit code."
          : `Enter the code sent to ${email.trim()}.`}
      </Text>

      {stage === "email" ? (
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
      ) : (
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          maxLength={6}
          style={[inputStyle, { textAlign: "center", letterSpacing: 8, fontSize: 20 }]}
        />
      )}

      <TouchableOpacity
        onPress={stage === "email" ? sendCode : verify}
        disabled={busy || (stage === "email" ? !email.includes("@") : code.length < 6)}
        style={{
          backgroundColor: colors.accent,
          borderRadius: 12,
          padding: 14,
          marginTop: 12,
          opacity: busy ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600", textAlign: "center", fontSize: 15 }}>
          {busy ? "…" : stage === "email" ? "Send code" : "Verify"}
        </Text>
      </TouchableOpacity>

      {stage === "code" && (
        <TouchableOpacity onPress={() => setStage("email")} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: "center" }}>← Different email</Text>
        </TouchableOpacity>
      )}

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
