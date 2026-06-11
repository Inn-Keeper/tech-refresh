import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import InterviewPrep from "./InterviewPrep.jsx";
import Contacts from "./Contacts.jsx";
import ArchBoard from "./ArchBoard.jsx";
import StoryBank from "./StoryBank.jsx";

const pages = [
  { id: "prep", label: "📚 Prep" },
  { id: "stories", label: "⭐ Stories" },
  { id: "board", label: "🧩 Arch Board" },
  { id: "contacts", label: "🤝 Contacts" },
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
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#0f1117", color: "#e2e8f0" }}>
      <header
        style={{
          borderBottom: "1px solid #1e2330",
          background: "#13161f",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px", color: "#f1f5f9" }}>
            Interview Prep
          </span>
          {session && (
            <>
              <nav style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPage(p.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      background: page === p.id ? "#6366f1" : "transparent",
                      color: page === p.id ? "#fff" : "#94a3b8",
                      transition: "all 0.15s",
                    }}
                  >
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
                  border: "1px solid #2d3748",
                  borderRadius: 8,
                  color: "#64748b",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      {session === undefined && (
        <p style={{ textAlign: "center", marginTop: 80, color: "#64748b", fontSize: 13 }}>Loading…</p>
      )}
      {session === null && <SignIn />}
      {session && (
        <>
          {page === "prep" && <InterviewPrep />}
          {page === "stories" && <StoryBank />}
          {page === "board" && <ArchBoard />}
          {page === "contacts" && <Contacts />}
        </>
      )}
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const inputStyle = {
    padding: "11px 14px",
    background: "#1e2330",
    border: "1px solid #2d3748",
    borderRadius: 10,
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <div style={{ maxWidth: 380, margin: "100px auto 0", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
      <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Sign in</h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
        Your pipeline and scores live behind your account.
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "11px 14px",
            background: "#6366f1",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Sign in
        </button>
        {error && <p style={{ margin: 0, fontSize: 12, color: "#fca5a5" }}>{error}</p>}
      </form>
    </div>
  );
}
