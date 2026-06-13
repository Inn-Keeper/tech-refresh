import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RANKS, rankForXp } from "@tech-refresh/core/gamification";
import { colors, layout, tints } from "@tech-refresh/core/tokens";
import { EMPTY_PROFILE_FORM, PROFILE_FIELDS, profileFormToUpdate, profileToForm } from "@tech-refresh/core/user";
import * as api from "./api.js";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  background: colors.bgDeep,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

export default function Profile() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_PROFILE_FORM);
  const { data: profile = null, error: loadError, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getUser,
  });
  const saveMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
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

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const rank = rankForXp(profile?.xp ?? 0);
  const next = RANKS.find((item) => item.min > rank.min);
  const save = (event) => {
    event.preventDefault();
    saveMutation.mutate(profileFormToUpdate(form));
  };
  const resetScores = () => {
    if (!window.confirm("Reset all XP and answer history? This cannot be undone.")) return;
    resetMutation.mutate();
  };
  const error = loadError || saveMutation.error || resetMutation.error;
  const completionItems = PROFILE_FIELDS.filter((field) => (form[field.key] ?? "").trim()).length;
  const completionPct = Math.round((completionItems / PROFILE_FIELDS.length) * 100);

  return (
    <main
      style={{
        minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        background: colors.bg,
      }}
    >
      <aside
        style={{
          borderRight: `1px solid ${colors.border}`,
          background: colors.bgDeep,
          flex: "0 0 340px",
          minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              background: colors.accent,
              color: colors.onAccent,
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {(profile?.displayName || profile?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, color: colors.textBright, fontSize: 20, fontWeight: 800 }}>
              {profile?.displayName || "Your profile"}
            </h1>
            <p style={{ margin: "3px 0 0", color: colors.textFaint, fontSize: 12, overflowWrap: "anywhere" }}>
              {profile?.email || "Loading..."}
            </p>
          </div>
        </div>

        <Panel>
          <MetaLabel>Rank</MetaLabel>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: colors.textBright, fontSize: 24 }}>{rank.name}</strong>
            <span style={{ color: colors.textDim, fontSize: 12, fontWeight: 700 }}>{profile?.xp ?? 0} XP</span>
          </div>
          <div style={{ height: 8, background: colors.well, borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
            <div
              style={{
                height: "100%",
                width: next ? `${Math.min(100, (((profile?.xp ?? 0) - rank.min) / (next.min - rank.min)) * 100)}%` : "100%",
                background: colors.accent,
              }}
            />
          </div>
          <p style={{ margin: "8px 0 0", color: colors.textFaint, fontSize: 12 }}>
            {next ? `${next.min - (profile?.xp ?? 0)} XP to ${next.name}` : "Top rank reached"}
          </p>
          <button
            onClick={resetScores}
            disabled={resetMutation.isPending || !profile}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "8px 12px",
              background: "transparent",
              border: `1px solid ${colors.danger}60`,
              borderRadius: 8,
              color: colors.dangerBright,
              fontSize: 12,
              fontWeight: 800,
              cursor: resetMutation.isPending || !profile ? "wait" : "pointer",
              opacity: resetMutation.isPending || !profile ? 0.6 : 1,
            }}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset score"}
          </button>
          {resetMutation.isSuccess && (
            <p style={{ margin: "8px 0 0", color: colors.successBright, fontSize: 12, fontWeight: 700 }}>
              Score reset
            </p>
          )}
        </Panel>

        <Panel>
          <MetaLabel>Profile</MetaLabel>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: colors.textBright, fontSize: 22 }}>{completionPct}%</strong>
            <span style={{ color: colors.textDim, fontSize: 12, fontWeight: 700 }}>
              {completionItems}/{PROFILE_FIELDS.length} fields
            </span>
          </div>
          <div style={{ height: 8, background: colors.well, borderRadius: 999, overflow: "hidden", marginTop: 12 }}>
            <div style={{ height: "100%", width: `${completionPct}%`, background: colors.success }} />
          </div>
          <p style={{ margin: "8px 0 0", color: colors.textFaint, fontSize: 12 }}>
            Optional details help keep your job-search workspace grounded.
          </p>
        </Panel>

        <div style={{ marginTop: "auto", color: colors.textFaint, fontSize: 12, lineHeight: 1.6 }}>
          Private account details stay tied to your signed-in Grip workspace.
        </div>
      </aside>

      <section
        style={{
          minWidth: 0,
          flex: "1 1 680px",
          minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
          padding: "56px clamp(28px, 6vw, 96px)",
          overflow: "auto",
        }}
      >
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 10 }}>
            <div>
              <p style={{ margin: "0 0 8px", color: colors.textFaint, fontSize: 13, fontWeight: 700 }}>Account</p>
              <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.12, fontWeight: 800, color: colors.textBright }}>
                Profile settings
              </h2>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 600 }}>
              {isLoading ? "loading..." : "Synced with Supabase"}
            </span>
          </div>
          <p style={{ maxWidth: 760, margin: "0 0 30px", color: colors.textDim, fontSize: 15, lineHeight: 1.7 }}>
            Manage the private identity, goals, and links that travel with your interview prep and hiring pipeline.
          </p>

          {error && (
            <div
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                background: tints.dangerSoft,
                border: `1px solid ${colors.danger}60`,
                borderRadius: 8,
                color: colors.dangerBright,
                fontSize: 13,
              }}
            >
              {error.message}
            </div>
          )}

          <form
            onSubmit={save}
            style={{
              borderTop: `1px solid ${colors.border}`,
              borderBottom: `1px solid ${colors.border}`,
              padding: "24px 0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <Field label="Email">
              <input value={profile?.email ?? ""} readOnly style={{ ...inputStyle, color: colors.textDim }} />
            </Field>

            {PROFILE_FIELDS.map((field) => (
              <Field key={field.key} label={field.label}>
                <input
                  value={form[field.key] ?? ""}
                  onChange={set(field.key)}
                  placeholder={field.placeholder}
                  style={inputStyle}
                />
              </Field>
            ))}

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              {saveMutation.isSuccess && (
                <span style={{ alignSelf: "center", color: colors.successBright, fontSize: 12, fontWeight: 700 }}>Saved</span>
              )}
              <button
                type="submit"
                disabled={saveMutation.isPending || !profile}
                style={{
                  padding: "10px 18px",
                  background: colors.accent,
                  border: "none",
                  borderRadius: 8,
                  color: colors.onAccent,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: saveMutation.isPending ? "wait" : "pointer",
                  opacity: saveMutation.isPending || !profile ? 0.6 : 1,
                }}
              >
                {saveMutation.isPending ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

function Panel({ children }) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function MetaLabel({ children }) {
  return (
    <p style={{ margin: "0 0 6px", color: colors.textFaint, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ color: colors.textFaint, fontSize: 11, fontWeight: 800 }}>{label}</span>
      {children}
    </label>
  );
}
