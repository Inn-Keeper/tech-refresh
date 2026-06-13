import { useEffect, useState } from "react";
import { t } from "@tech-refresh/core/i18n";
import { supabase } from "./supabase.js";
import InterviewPrep from "./InterviewPrep.jsx";
import Contacts from "./Contacts.jsx";
import ArchBoard from "./ArchBoard.jsx";
import StoryBank from "./StoryBank.jsx";
import Profile from "./Profile.tsx";
import { brand, colors, layout } from "@tech-refresh/core/tokens";
import { BrandIcon } from "./BrandIcon.jsx";

const pages = [
  { id: "prep", icon: "layers", label: t("tabs.prep") },
  { id: "stories", icon: "story", label: t("tabs.stories") },
  { id: "board", icon: "board", label: t("tabs.board") },
  { id: "contacts", icon: "contact", label: t("tabs.contacts") },
  { id: "profile", icon: "profile", label: t("tabs.profile") },
];

export default function App() {
  const [page, setPage] = useState("prep");
  const [session, setSession] = useState(undefined); // undefined = checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: colors.bg, color: colors.text }}>
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
        }}
      >
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
              <img src="/logo-symbol.svg" alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
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
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  flexWrap: "wrap",
                  padding: 5,
                  borderRadius: 16,
                  background: `${colors.well}C7`,
                  border: `1px solid ${colors.border}`,
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                }}
              >
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPage(p.id)}
                    aria-current={page === p.id ? "page" : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minHeight: 36,
                      padding: "8px 14px",
                      borderRadius: 11,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0px",
                      background: page === p.id ? colors.accent : "transparent",
                      color: page === p.id ? colors.onAccent : colors.textDim,
                      boxShadow: page === p.id ? `0 8px 22px ${colors.accent}22` : "none",
                      transition: "background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease",
                    }}
                  >
                    <BrandIcon name={p.icon} color={page === p.id ? colors.onAccent : colors.textDim} size={16} />
                    {p.label}
                  </button>
                ))}
              </nav>
              <button
                onClick={() => supabase.auth.signOut()}
                title={session.user.email}
                style={{
                  minHeight: 36,
                  padding: "8px 13px",
                  background: colors.bgDeep,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 11,
                  color: colors.textFaint,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                }}
              >
                {t("auth.signOut")}
              </button>
            </>
          )}
        </div>
      </header>

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
          {page === "profile" && <Profile />}
        </>
      )}
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const inputStyle = {
    padding: "11px 14px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    color: colors.text,
    fontSize: 14,
    outline: "none",
  };

  const submit = async (e) => {
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
        <img src="/logo-symbol.svg" alt="" style={{ width: 76, height: 62, objectFit: "contain", marginBottom: 12 }} />
        <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: colors.textBright }}>
          {brand.productName}
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 13, color: colors.textFaint, lineHeight: 1.6 }}>
          {brand.promise}
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
