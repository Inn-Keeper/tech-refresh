import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RANKS, rankForXp } from "@tech-refresh/core/gamification";
import { t } from "@tech-refresh/core/i18n";
import { EMPTY_PROFILE_FORM, PROFILE_FIELDS, profileFormToUpdate, profileToForm } from "@tech-refresh/core/user";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { colors, font, radius, space } from "@/theme";
import { Button, Field, HeaderAction, Screen, ScreenHeader, inputStyle } from "@/components/ui";

type ProfileForm = Record<string, string>;

export default function ProfileScreen() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const { data: profile = null, error: loadError } = useQuery({ queryKey: ["profile"], queryFn: api.getUser });
  const saveMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (saved) => queryClient.setQueryData(["profile"], saved),
  });
  const resetMutation = useMutation({
    mutationFn: api.resetScores,
    onSuccess: () => {
      queryClient.setQueryData(["scores"], { xp: 0, answers: {} });
      if (profile) queryClient.setQueryData(["profile"], { ...profile, xp: 0 });
      queryClient.invalidateQueries({ queryKey: ["accuracy-timeline"] });
    },
  });

  useEffect(() => {
    if (!profile) return;
    setForm(profileToForm(profile));
  }, [profile]);

  const set = (key: string) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const rank = rankForXp(profile?.xp ?? 0);
  const next = RANKS.find((item) => item.min > rank.min);
  const progress = next ? Math.min(1, ((profile?.xp ?? 0) - rank.min) / (next.min - rank.min)) : 1;
  const resetScores = () => {
    Alert.alert("Reset score?", "This clears all XP and answer history. It cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => resetMutation.mutate() },
    ]);
  };
  const error = loadError || saveMutation.error || resetMutation.error;

  return (
    <Screen>
      <ScreenHeader
        title={t("tabs.profile")}
        subtitle="Private account details and job-search goals."
        right={<HeaderAction label={t("auth.signOut")} tone="muted" onPress={() => supabase.auth.signOut()} />}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && <Text style={{ color: colors.dangerBright, fontSize: font.size.body }}>{error.message}</Text>}

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.onAccent, fontSize: font.size.title, fontWeight: "800" }}>
                {(profile?.displayName || profile?.email || "?").slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.textBright, fontSize: font.size.title, fontWeight: "800" }} numberOfLines={1}>
                {profile?.displayName || "Your profile"}
              </Text>
              <Text style={{ color: colors.textDim, fontSize: font.size.small }} numberOfLines={1}>
                {profile?.email || "Loading..."}
              </Text>
            </View>
          </View>

          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.xs }}>
              <Text style={{ color: colors.textBright, fontSize: font.size.body, fontWeight: "700" }}>{rank.name}</Text>
              <Text style={{ color: colors.textDim, fontSize: font.size.small }}>{profile?.xp ?? 0} XP</Text>
            </View>
            <View style={{ height: 8, backgroundColor: colors.bgDeep, borderRadius: radius.pill, overflow: "hidden" }}>
              <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: colors.accent }} />
            </View>
            <Text style={{ color: colors.textFaint, fontSize: font.size.small, marginTop: space.xs }}>
              {next ? `${next.min - (profile?.xp ?? 0)} XP to ${next.name}` : "Top rank reached"}
            </Text>
            <TouchableOpacity
              onPress={resetScores}
              disabled={!profile || resetMutation.isPending}
              style={{
                marginTop: space.md,
                borderWidth: 1,
                borderColor: `${colors.danger}60`,
                borderRadius: radius.sm,
                paddingVertical: space.sm,
                alignItems: "center",
                opacity: !profile || resetMutation.isPending ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.dangerBright, fontSize: font.size.body, fontWeight: "800" }}>
                {resetMutation.isPending ? "Resetting..." : "Reset score"}
              </Text>
            </TouchableOpacity>
            {resetMutation.isSuccess && (
              <Text style={{ color: colors.successBright, fontSize: font.size.small, fontWeight: "700", marginTop: space.xs }}>
                Score reset
              </Text>
            )}
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.lg, gap: space.md }}>
          <Field label="Email">
            <TextInput editable={false} value={profile?.email ?? ""} style={[inputStyle, { color: colors.textDim }]} />
          </Field>

          {PROFILE_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <TextInput
                value={form[field.key]}
                onChangeText={set(field.key)}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textFaint}
                keyboardType={field.keyboardType === "url" ? "url" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
                style={inputStyle}
              />
            </Field>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: space.md }}>
            {saveMutation.isSuccess && <Text style={{ color: colors.successBright, fontSize: font.size.small, fontWeight: "700" }}>Saved</Text>}
            <Button
              label={saveMutation.isPending ? t("common.saving") : t("common.save")}
              onPress={() => saveMutation.mutate(profileFormToUpdate(form))}
              disabled={!profile || saveMutation.isPending}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
