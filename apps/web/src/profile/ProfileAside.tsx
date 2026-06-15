import { PROFILE_FIELDS } from "@tech-refresh/core/user";
import { colors, layout } from "@tech-refresh/core/tokens";
import { ConnectionBadge, MetaLabel, Panel, Switch } from "./shared";
import type { ProfileForm, ProfileRecord, Rank } from "./types";

export function ProfileAside({
  completionItems,
  completionPct,
  form,
  githubConnected,
  githubPrepPending,
  linkPending,
  onGithubPrepChange,
  onLinkGitHub,
  onPoeVisibilityChange,
  onResetScores,
  onSignOut,
  poeVisible,
  profile,
  rank,
  resetPending,
  resetSuccess,
  next,
}: {
  completionItems: number;
  completionPct: number;
  form: ProfileForm;
  githubConnected: boolean;
  githubPrepPending: boolean;
  linkPending: boolean;
  onGithubPrepChange: (checked: boolean) => void;
  onLinkGitHub: () => void;
  onPoeVisibilityChange: (checked: boolean) => void;
  onResetScores: () => void;
  onSignOut?: () => void;
  poeVisible: boolean;
  profile: ProfileRecord | null;
  rank: Rank;
  resetPending: boolean;
  resetSuccess: boolean;
  next?: Rank;
}) {
  return (
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
          onClick={onResetScores}
          disabled={resetPending || !profile}
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
            cursor: resetPending || !profile ? "wait" : "pointer",
            opacity: resetPending || !profile ? 0.6 : 1,
          }}
        >
          {resetPending ? "Resetting..." : "Reset score"}
        </button>
        {resetSuccess && (
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
          onClick={onLinkGitHub}
          disabled={githubConnected || linkPending || !profile}
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
            cursor: githubConnected || linkPending || !profile ? "default" : "pointer",
            opacity: linkPending || !profile ? 0.6 : 1,
          }}
        >
          {githubConnected ? "GitHub connected" : linkPending ? "Opening GitHub..." : "Connect GitHub"}
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
            disabled={!githubConnected || !form.githubUrl || githubPrepPending}
            label="Use GitHub techs for prep recommendations"
            onChange={onGithubPrepChange}
          />
        </div>
      </Panel>

      <Panel>
        <MetaLabel>Preferences</MetaLabel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ color: colors.text, fontSize: 12, lineHeight: 1.45 }}>
            <span style={{ display: "block", color: colors.textBright, fontWeight: 800 }}>Poe assistant</span>
            <span style={{ display: "block", marginTop: 3, color: colors.textFaint }}>Show Poe on Interview Prep.</span>
          </span>
          <Switch
            checked={poeVisible}
            disabled={false}
            label="Show Poe assistant on Interview Prep"
            onChange={onPoeVisibilityChange}
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
  );
}
