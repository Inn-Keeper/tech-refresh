import { useState } from "react";
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
          }}
        >
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px", color: "#f1f5f9" }}>
            Interview Prep
          </span>
          <nav style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
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
        </div>
      </header>

      {page === "prep" && <InterviewPrep />}
      {page === "stories" && <StoryBank />}
      {page === "board" && <ArchBoard />}
      {page === "contacts" && <Contacts />}
    </div>
  );
}
