import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { t } from "@tech-refresh/core/i18n";
import { friendlyAuthError } from "@tech-refresh/core/auth";
import { supabase } from "./supabase";
import InterviewPrep from "./InterviewPrep";
import Contacts from "./Contacts";
import ArchBoard from "./ArchBoard";
import StoryBank from "./StoryBank";
import Profile from "./Profile";
import { brand, colors, layout } from "@tech-refresh/core/tokens";
import { BrandIcon } from "./BrandIcon";

const pages = [
  { id: "prep", icon: "layers", label: t("tabs.prep") },
  { id: "stories", icon: "story", label: t("tabs.stories") },
  { id: "board", icon: "board", label: t("tabs.board") },
  { id: "contacts", icon: "contact", label: t("tabs.contacts") },
  { id: "profile", icon: "profile", label: t("tabs.profile") },
];

const GITHUB_LINK_PENDING_KEY = "grip.githubLinkPending";
const GITHUB_LINKED_KEY = "grip.githubLinked";
const ACTIVE_PAGE_KEY = "grip.activePage";

const DEFAULT_PAGE = "prep";
const pageIds = pages.map((p) => p.id);

// Resolves which page to show on load. An active GitHub OAuth return
// (?linked=github) or a pending link wins, so the user lands on profile to
// finish linking. Otherwise restore the last page they were on; a *completed*
// link (GITHUB_LINKED_KEY) is intentionally NOT a routing signal, or every
// reload would force profile.
const initialPage = () => {
  if (typeof window === "undefined") return DEFAULT_PAGE;
  const params = new URLSearchParams(window.location.search);
  if (params.get("linked") === "github" || window.localStorage.getItem(GITHUB_LINK_PENDING_KEY) === "1") {
    return "profile";
  }
  const saved = window.localStorage.getItem(ACTIVE_PAGE_KEY);
  return saved && pageIds.includes(saved) ? saved : DEFAULT_PAGE;
};

export default function App() {
  const [page, setPage] = useState(initialPage);
  const [githubLinked, setGithubLinked] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("linked") === "github" || window.localStorage.getItem(GITHUB_LINKED_KEY) === "1";
  });
  // undefined = loading, null = signed out, Session = signed in
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const activePageIndex = Math.max(0, pages.findIndex((p) => p.id === page));

  // Persist the page so a reload restores it instead of resetting to prep.
  const selectPage = (id: string) => {
    setPage(id);
    window.localStorage.setItem(ACTIVE_PAGE_KEY, id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = () => {
    window.localStorage.removeItem(GITHUB_LINK_PENDING_KEY);
    window.localStorage.removeItem(GITHUB_LINKED_KEY);
    window.localStorage.removeItem(ACTIVE_PAGE_KEY);
    supabase.auth.signOut();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("linked") !== "github") return;
    window.localStorage.removeItem(GITHUB_LINK_PENDING_KEY);
    window.localStorage.setItem(GITHUB_LINKED_KEY, "1");
    setGithubLinked(true);
    params.delete("linked");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        minHeight: "100vh",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Noise texture overlay — low-opacity, pointer-events-none so it never blocks interaction */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          opacity: 0.032,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />
      <header
        style={{
          minHeight: layout.webHeaderHeight,
          borderBottom: `1px solid ${colors.border}`,
          background: `linear-gradient(180deg, ${colors.bgDeep}, ${colors.bg}F2)`,
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(14px)",
          boxShadow: "0 14px 38px rgba(0, 0, 0, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.04,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M0 8L8 0M-1 1L1-1M7 9L9 7' stroke='%23ffffff' stroke-width='0.8'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
            backgroundSize: "8px 8px",
          }}
        />
        <div
          style={{
            minHeight: layout.webHeaderHeight,
            padding: "10px 24px",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 150 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(145deg, ${colors.surfaceHi}, ${colors.bgDeep})`,
                border: `1px solid ${colors.border}`,
                boxShadow: `0 0 0 1px ${colors.accent}18, 0 10px 24px rgba(0, 0, 0, 0.22)`,
              }}
            >
              <LogoPlaceholder size={24} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0px", color: colors.textBright, lineHeight: 1 }}>
                {brand.productName}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.textFaint, lineHeight: 1.2 }}>
                {brand.tagline}
              </span>
            </span>
          </div>
          {session && (
            <>
              <nav
                aria-label="Primary"
                style={{
                  marginLeft: "auto",
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))`,
                  alignItems: "center",
                  padding: 5,
                  borderRadius: 16,
                  background: `${colors.well}C7`,
                  border: `1px solid ${colors.border}`,
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                  overflow: "hidden",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: 5,
                    bottom: 5,
                    left: 5,
                    width: `calc((100% - 10px) / ${pages.length})`,
                    borderRadius: 11,
                    background: colors.accent,
                    boxShadow: `0 8px 22px ${colors.accent}22`,
                    transform: `translateX(${activePageIndex * 100}%)`,
                    transition: "transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.28s ease",
                    willChange: "transform",
                  }}
                />
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPage(p.id)}
                    aria-current={page === p.id ? "page" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      position: "relative",
                      zIndex: 1,
                      minHeight: 36,
                      padding: "8px 14px",
                      borderRadius: 11,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0px",
                      whiteSpace: "nowrap",
                      background: "transparent",
                      color: page === p.id ? colors.onAccent : colors.textDim,
                      transition: "color 0.2s ease, transform 0.16s ease",
                    }}
                  >
                    <BrandIcon name={p.icon} color={page === p.id ? colors.onAccent : colors.textDim} size={16} />
                    {p.label}
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
      </header>

      <div style={{ flex: 1 }}>
        {session === undefined && (
          <main
            style={{
              minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
              display: "grid",
              placeItems: "center",
              color: colors.textFaint,
              fontSize: 13,
            }}
          >
            Loading…
          </main>
        )}
        {session === null && <SignIn />}
        {session && (
          <>
            {page === "prep" && <InterviewPrep />}
            {page === "stories" && <StoryBank />}
            {page === "board" && <ArchBoard />}
            {page === "contacts" && <Contacts />}
            {page === "profile" && <Profile githubLinked={githubLinked} onGitHubLinkedSeen={() => setGithubLinked(false)} onSignOut={signOut} />}
          </>
        )}
      </div>

      <Footer onNavigate={session ? selectPage : null} />
    </div>
  );
}

type FooterLink = { label: string; action: (() => void) | null; href?: never } | { label: string; href: string; action?: never };

function Footer({ onNavigate }: { onNavigate: ((page: string) => void) | null }) {
  const productLinks: FooterLink[] = pages.map((page) => ({
    label: page.label,
    action: onNavigate ? () => onNavigate(page.id) : null,
  }));

  return (
    <footer
      style={{
        borderTop: `1px solid ${colors.border}`,
        background: colors.bgDeep,
        padding: "28px 24px 30px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
            <LogoPlaceholder size={28} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: colors.textBright, lineHeight: 1 }}>{brand.productName}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.textFaint, marginTop: 3 }}>{brand.tagline}</div>
            </div>
          </div>
          <p style={{ margin: 0, color: colors.textDim, fontSize: 12.5, lineHeight: 1.6 }}>
            {brand.promise} Web and mobile share one Supabase-backed practice workspace for prep, stories, quests, boards, and profile data.
          </p>
        </div>

        <FooterColumn title="Product" links={productLinks} />
      </div>

      <div
        style={{
          marginTop: 26,
          paddingTop: 16,
          borderTop: `1px solid ${colors.surface}`,
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          color: colors.textFaint,
          fontSize: 11.5,
          fontWeight: 600,
        }}
      >
        <span>Built by InnKeeper Digital Solutions © {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 10px", color: colors.textBright, fontSize: 12, fontWeight: 800 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((link) =>
          link.href ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              style={{ color: colors.textDim, textDecoration: "none", fontSize: 12, fontWeight: 700 }}
            >
              {link.label}
            </a>
          ) : (
            <button
              key={link.label}
              type="button"
              onClick={link.action ?? undefined}
              disabled={!link.action}
              style={{
                padding: 0,
                background: "transparent",
                border: "none",
                color: link.action ? colors.textDim : colors.textFaint,
                textAlign: "left",
                fontSize: 12,
                fontWeight: 700,
                cursor: link.action ? "pointer" : "default",
              }}
            >
              {link.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const inputStyle: React.CSSProperties = {
    padding: "11px 14px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    outline: "none",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signin") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    } else {
      const { data, error: err } = await supabase.auth.signUp({ email, password });
      if (err) {
        setError(err.message);
      } else if (!data.session) {
        // "Confirm email" is still enabled in Supabase — without SMTP that mail never arrives.
        setNotice(
          "Account created, but email confirmation is enabled in Supabase. Disable “Confirm email” under Authentication → Sign In / Providers to activate accounts instantly."
        );
      }
      // With confirmation disabled, signUp returns a session and the auth listener signs us in.
    }
    setBusy(false);
  };

  const signInWithGitHub = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    if (err) {
      setError(friendlyAuthError(err.message));
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
        display: "grid",
        placeItems: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 380, textAlign: "center" }}>
        <div style={{ width: 76, height: 62, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
          <LogoPlaceholder size={42} />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: colors.textBright }}>
          {brand.productName}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: colors.textFaint, lineHeight: 1.6 }}>
          {brand.promise}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={signInWithGitHub}
            disabled={busy}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 14px",
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              color: colors.textBright,
              fontSize: 14,
              fontWeight: 700,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            <BrandIcon name="code" color={colors.accentBright} size={15} />
            Continue with GitHub
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: colors.textFaint, fontSize: 11, fontWeight: 700 }}>
            <span style={{ flex: 1, height: 1, background: colors.border }} />
            or
            <span style={{ flex: 1, height: 1, background: colors.border }} />
          </div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "password (8+ characters)" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            style={inputStyle}
          />
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "11px 14px",
              background: colors.accent,
              border: "none",
              borderRadius: 10,
              color: colors.onAccent,
              fontSize: 14,
              fontWeight: 600,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {error && <p style={{ margin: 0, fontSize: 12, color: colors.dangerBright }}>{error}</p>}
          {notice && <p style={{ margin: 0, fontSize: 12, color: colors.warningBright, lineHeight: 1.5 }}>{notice}</p>}
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          style={{
            marginTop: 18,
            background: "transparent",
            border: "none",
            color: colors.textDim,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}

function LogoPlaceholder({ size }: { size: number }) {
  return <BrandIcon name="spark" color={colors.accentBright} size={size} />;
}

