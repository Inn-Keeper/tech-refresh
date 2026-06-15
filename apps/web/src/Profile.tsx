import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RANKS, rankForXp } from "@tech-refresh/core/gamification";
import { colors, layout, tints } from "@tech-refresh/core/tokens";
import { EMPTY_PROFILE_FORM, PROFILE_FIELDS, profileFormToUpdate, profileToForm } from "@tech-refresh/core/user";
import { friendlyAuthError } from "@tech-refresh/core/auth";
import * as api from "./api";
import { supabase } from "./supabase";
import { poeVisibleByDefault, setPoeAssistantVisible } from "./poeAssistantUtils";

type ProfileForm = {
  displayName: string;
  headline: string;
  targetRole: string;
  location: string;
  timezone: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  [key: string]: string;
};

const inputStyle: React.CSSProperties = {
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

const GITHUB_LINK_PENDING_KEY = "grip.githubLinkPending";
const GITHUB_LINKED_KEY = "grip.githubLinked";

type ProfileProps = {
  githubLinked?: boolean;
  onGitHubLinkedSeen?: () => void;
  onSignOut?: () => void;
};

export default function Profile({ githubLinked = false, onGitHubLinkedSeen, onSignOut }: ProfileProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM as ProfileForm);
  const [linkedInThisSession, setLinkedInThisSession] = useState(() => githubLinked || window.localStorage.getItem(GITHUB_LINKED_KEY) === "1");
  const [poeVisible, setPoeVisible] = useState(poeVisibleByDefault);
  const { data: profile = null, error: loadError, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: api.getUser,
  });
  const { data: identities = [], error: identitiesError } = useQuery({
    queryKey: ["auth-identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw error;
      return data.identities ?? [];
    },
  });
  const { data: authUser = null, error: authUserError } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user ?? null;
    },
  });
  const { data: githubViewerUrl = "", error: githubViewerError } = useQuery({
    queryKey: ["github-viewer-url", githubLinked],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.provider_token;
      if (!token) return "";
      const response = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return "";
      const viewer = await response.json();
      return typeof viewer.html_url === "string" ? viewer.html_url : "";
    },
    enabled: githubLinked,
    retry: false,
    staleTime: 1000 * 60 * 15,
  });
  const authProviders = authUser?.app_metadata?.providers ?? [];
  const authIdentities = authUser?.identities ?? [];
  const githubIdentity = [...identities, ...authIdentities].find((identity) => identity.provider === "github");
  const githubAccountId = githubAccountIdFromIdentity(githubIdentity) || githubAccountIdFromMetadata(authUser?.user_metadata);
  const { data: githubPublicUrl = "", error: githubPublicError } = useQuery({
    queryKey: ["github-public-url", githubAccountId],
    queryFn: async () => {
      if (!githubAccountId) return "";
      const response = await fetch(`https://api.github.com/user/${encodeURIComponent(githubAccountId)}`);
      if (!response.ok) return "";
      const user = await response.json();
      return typeof user.html_url === "string" ? user.html_url : "";
    },
    enabled: !!githubAccountId,
    retry: false,
    staleTime: 1000 * 60 * 60,
  });
  const saveMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["scores"] });
    },
  });
  const saveGithubUrlMutation = useMutation({
    mutationFn: (githubUrl: string) => api.updateProfile({ githubUrl }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["github-techs"] });
    },
  });
  const githubPrepMutation = useMutation({
    mutationFn: (useGithubTechsForPrep: boolean) => api.updateProfile({ useGithubTechsForPrep }),
    onSuccess: (saved) => {
      queryClient.setQueryData(["profile"], saved);
      queryClient.invalidateQueries({ queryKey: ["github-techs"] });
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
  const linkGitHubMutation = useMutation({
    mutationFn: async () => {
      window.localStorage.setItem(GITHUB_LINK_PENDING_KEY, "1");
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/?linked=github`, skipBrowserRedirect: true },
      });
      if (error) {
        window.localStorage.removeItem(GITHUB_LINK_PENDING_KEY);
        throw new Error(friendlyAuthError(error.message));
      }
      if (data?.url) window.location.assign(data.url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-identities"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const githubUrl = profile?.githubUrl || githubUrlFromIdentity(githubIdentity) || githubUrlFromMetadata(authUser?.user_metadata) || githubViewerUrl || githubPublicUrl;
  // "Connected" means a real GitHub OAuth identity is linked — not merely that a
  // githubUrl exists, since that can be a hand-typed/saved profile field.
  const githubConnected = linkedInThisSession || authProviders.includes("github") || !!githubIdentity;

  useEffect(() => {
    if (!profile) return;
    const next = profileToForm(profile) as ProfileForm;
    if (!next.githubUrl && githubUrl) next.githubUrl = githubUrl;
    setForm(next);
  }, [githubUrl, profile]);

  useEffect(() => {
    if (!profile || profile.githubUrl || !githubUrl || saveGithubUrlMutation.isPending) return;
    saveGithubUrlMutation.mutate(githubUrl);
  }, [githubUrl, profile, saveGithubUrlMutation]);

  useEffect(() => {
    if (!githubLinked) return;
    setLinkedInThisSession(true);
    const timeout = window.setTimeout(() => onGitHubLinkedSeen?.(), 4000);
    return () => window.clearTimeout(timeout);
  }, [githubLinked, onGitHubLinkedSeen]);

  const set = (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const rank = rankForXp(profile?.xp ?? 0) ?? RANKS[0]!;
  const next = RANKS.find((item) => item.min > rank.min);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    saveMutation.mutate(profileFormToUpdate(form));
  };
  const resetScores = () => {
    if (!window.confirm("Reset all XP and answer history? This cannot be undone.")) return;
    resetMutation.mutate();
  };
  const updatePoeVisibility = (checked: boolean) => {
    setPoeVisible(checked);
    setPoeAssistantVisible(checked);
  };
  const error = loadError || identitiesError || authUserError || githubViewerError || githubPublicError || saveMutation.error || saveGithubUrlMutation.error || githubPrepMutation.error || resetMutation.error || linkGitHubMutation.error;
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

        <Panel>
          <MetaLabel>Connections</MetaLabel>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <strong style={{ color: colors.textBright, fontSize: 18 }}>GitHub</strong>
            <ConnectionBadge connected={githubConnected} />
          </div>
          <p style={{ margin: "8px 0 0", color: colors.textFaint, fontSize: 12, lineHeight: 1.5 }}>
            {githubConnected
              ? "GitHub is linked to this protected workspace. Profile-based prep can use your public repo techs."
              : "Link GitHub while signed in to keep this same protected workspace and unlock profile-based prep."}
          </p>
          {githubConnected && form.githubUrl && (
            <a
              href={form.githubUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block",
                marginTop: 10,
                color: colors.accentBright,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
                overflowWrap: "anywhere",
              }}
            >
              {form.githubUrl}
            </a>
          )}
          <button
            onClick={() => linkGitHubMutation.mutate()}
            disabled={githubConnected || linkGitHubMutation.isPending || !profile}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "9px 12px",
              background: githubConnected ? "transparent" : colors.surfaceHi,
              border: `1px solid ${githubConnected ? colors.success : colors.border}`,
              borderRadius: 8,
              color: githubConnected ? colors.successBright : colors.textBright,
              fontSize: 12,
              fontWeight: 800,
              cursor: githubConnected || linkGitHubMutation.isPending || !profile ? "default" : "pointer",
              opacity: linkGitHubMutation.isPending || !profile ? 0.6 : 1,
            }}
          >
            {githubConnected ? "GitHub connected" : linkGitHubMutation.isPending ? "Opening GitHub..." : "Connect GitHub"}
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${colors.border}`,
              color: githubConnected && form.githubUrl ? colors.text : colors.textFaint,
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            <span>
              <span style={{ display: "block", fontWeight: 800 }}>Use for prep recommendations</span>
              <span style={{ display: "block", marginTop: 3, color: colors.textFaint }}>
                Show the From GitHub techs category on Interview Prep.
              </span>
            </span>
            <Switch
              checked={!!profile?.useGithubTechsForPrep}
              disabled={!githubConnected || !form.githubUrl || githubPrepMutation.isPending}
              label="Use GitHub techs for prep recommendations"
              onChange={(checked) => githubPrepMutation.mutate(checked)}
            />
          </div>
        </Panel>

        <Panel>
          <MetaLabel>Preferences</MetaLabel>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span style={{ color: colors.text, fontSize: 12, lineHeight: 1.45 }}>
              <span style={{ display: "block", color: colors.textBright, fontWeight: 800 }}>Poe assistant</span>
              <span style={{ display: "block", marginTop: 3, color: colors.textFaint }}>
                Show Poe on Interview Prep.
              </span>
            </span>
            <Switch
              checked={poeVisible}
              disabled={false}
              label="Show Poe assistant on Interview Prep"
              onChange={updatePoeVisibility}
            />
          </div>
        </Panel>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, color: colors.textFaint, fontSize: 12, lineHeight: 1.6 }}>
            Private account details stay tied to your signed-in Grip workspace.
          </p>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              style={{
                width: "100%",
                padding: "9px 12px",
                background: "transparent",
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.textFaint,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Sign out
            </button>
          )}
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
            {isLoading && (
              <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 600 }}>
                loading...
              </span>
            )}
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

          {githubLinked && (
            <div
              style={{
                marginBottom: 18,
                padding: "12px 14px",
                background: tints.successSoft,
                border: `1px solid ${colors.success}60`,
                borderRadius: 8,
                color: colors.successBright,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              GitHub connected to this workspace.
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

function githubUrlFromIdentity(identity: { identity_data?: Record<string, unknown> } | undefined) {
  const data = identity?.identity_data ?? {};
  const directUrl = (data.html_url || data.profile_url || (typeof data.avatar_url === "string" ? data.avatar_url.replace(/\/?u\/\d+.*/, "") : "")) as string;
  if (typeof directUrl === "string" && directUrl.includes("github.com/") && !directUrl.includes("avatars.githubusercontent.com")) {
    return directUrl;
  }
  return githubUrlFromMetadata(data);
}

function githubUrlFromMetadata(data: Record<string, unknown> | undefined) {
  const username = data?.user_name || data?.preferred_username || data?.login;
  return username ? `https://github.com/${username}` : "";
}

function githubAccountIdFromIdentity(identity: { identity_data?: Record<string, unknown> } | undefined) {
  return githubAccountIdFromMetadata(identity?.identity_data);
}

function githubAccountIdFromMetadata(data: Record<string, unknown> | undefined) {
  const id = data?.provider_id || data?.sub || data?.id;
  return id ? String(id) : "";
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        background: connected ? tints.successSoft : colors.surfaceHi,
        border: `1px solid ${connected ? colors.success : colors.border}`,
        color: connected ? colors.successBright : colors.textFaint,
        fontSize: 11,
        fontWeight: 850,
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: connected ? colors.successBright : colors.textFaint,
        }}
      />
      {connected ? "Linked" : "Optional"}
    </span>
  );
}

function Switch({ checked, disabled, label, onChange }: { checked: boolean; disabled: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 48,
        height: 28,
        padding: 3,
        flex: "0 0 auto",
        borderRadius: 999,
        border: `1px solid ${checked ? colors.accent : colors.border}`,
        background: checked ? `linear-gradient(135deg, ${colors.accent}, ${colors.accentBright})` : colors.bgDeep,
        boxShadow: checked ? `0 0 0 3px ${colors.accent}1F, 0 8px 18px ${colors.accent}22` : "inset 0 1px 0 rgba(255,255,255,0.04)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: 20,
          height: 20,
          borderRadius: 999,
          background: checked ? colors.onAccent : colors.textFaint,
          boxShadow: checked ? "0 4px 12px rgba(0,0,0,0.28)" : "0 3px 9px rgba(0,0,0,0.35)",
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.18s ease",
        }}
      />
    </button>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
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

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 6px", color: colors.textFaint, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <span style={{ color: colors.textFaint, fontSize: 11, fontWeight: 800 }}>{label}</span>
      {children}
    </label>
  );
}
