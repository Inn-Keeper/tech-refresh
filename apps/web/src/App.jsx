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
          borderBottom: `1px solid ${colors.surface}`,
          background: colors.bgDeep,
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px", color: colors.textBright }}>
            {brand.productName}
          </span>
          {session && (
            <>
              <nav style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPage(p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 14px",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      background: page === p.id ? colors.accent : "transparent",
                      color: page === p.id ? colors.onAccent : colors.textDim,
                      transition: "all 0.15s",
                    }}
                  >
                    <BrandIcon name={p.icon} color={page === p.id ? colors.onAccent : colors.textDim} size={14} />
                    {p.label}
                  </button>
                ))}
              </nav>
              <button
                onClick={() => supabase.auth.signOut()}
                title={session.user.email}
                style={{
                  padding: "5px 12px",
                  background: "transparent",
                  border: `1px solid ${colors.border}`,
                  borderRadius: 8,
                  color: colors.textFaint,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
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
