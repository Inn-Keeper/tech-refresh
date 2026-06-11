import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { COMPETENCIES, COMPETENCY_COLORS, PROMPTS } from "@tech-refresh/core/stories";
import * as api from "./api.js";

const EMPTY_FORM = {
  title: "",
  competency: "Conflict",
  situation: "",
  task: "",
  action: "",
  result: "",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  background: "#13161f",
  border: "1px solid #2d3748",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};

const textareaStyle = { ...inputStyle, minHeight: 64, resize: "vertical", lineHeight: 1.5 };

export default function StoryBank() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null); // story id, "new", or null
  const [mode, setMode] = useState("stories"); // "stories" | "drill"

  const { data: stories = null, error: loadError } = useQuery({
    queryKey: ["stories"],
    queryFn: api.listStories,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stories"] });
  const saveMutation = useMutation({ mutationFn: api.upsertStory, onSettled: invalidate });
  const deleteMutation = useMutation({ mutationFn: api.deleteStory, onSettled: invalidate });

  const mutationError = saveMutation.error || deleteMutation.error;
  const error = loadError
    ? `Couldn't load stories: ${loadError.message}`
    : mutationError
      ? `Save failed: ${mutationError.message}`
      : null;

  const handleSave = (form) => {
    if (!form.title.trim()) return;
    saveMutation.mutate({ ...form, id: editingId === "new" ? undefined : editingId });
    setEditingId(null);
  };

  const handleDelete = (s) => {
    if (window.confirm(`Delete "${s.title}"?`)) {
      deleteMutation.mutate(s.id);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 48px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#f1f5f9" }}>
          Story Bank
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b", fontWeight: 500 }}>
          {stories ? `${stories.length} stories` : "loading…"}
        </span>
      </div>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
        Your STAR stories for behavioral interviews. Aim for 8–10 covering different competencies — one
        real story can serve several prompts.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16, padding: "10px 14px", background: "#7f1d1d30",
            border: "1px solid #ef444460", borderRadius: 10, color: "#fca5a5", fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[
          { id: "stories", label: "✍️ My stories" },
          { id: "drill", label: "🎤 Drill prompts" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              background: mode === m.id ? "#6366f1" : "#1e2330",
              color: mode === m.id ? "#fff" : "#94a3b8",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "drill" ? (
        <PromptDrill stories={stories || []} />
      ) : (
        <>
          {stories && editingId !== "new" && (
            <button
              onClick={() => setEditingId("new")}
              style={{
                marginBottom: 16, padding: "9px 16px", background: "#6366f125",
                border: "1px solid #6366f160", borderRadius: 10, color: "#a5b4fc",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              + Add story
            </button>
          )}

          {editingId === "new" && (
            <div style={{ marginBottom: 16 }}>
              <StoryForm initial={EMPTY_FORM} onSave={handleSave} onCancel={() => setEditingId(null)} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stories?.length === 0 && editingId !== "new" && (
              <p style={{ color: "#475569", fontSize: 13, textAlign: "center", marginTop: 24 }}>
                No stories yet. Start with your best "impact" story — the one you'd tell if you could only tell one.
              </p>
            )}
            {stories?.map((s) =>
              editingId === s.id ? (
                <StoryForm key={s.id} initial={s} onSave={handleSave} onCancel={() => setEditingId(null)} />
              ) : (
                <StoryCard key={s.id} story={s} onEdit={() => setEditingId(s.id)} onDelete={() => handleDelete(s)} />
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CompetencyBadge({ competency }) {
  const color = COMPETENCY_COLORS[competency] || "#64748b";
  return (
    <span
      style={{
        padding: "3px 10px", background: `${color}20`, borderRadius: 20,
        color, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
      }}
    >
      {competency.toUpperCase()}
    </span>
  );
}

function StoryCard({ story: s, onEdit, onDelete, readOnly }) {
  const [expanded, setExpanded] = useState(false);
  const color = COMPETENCY_COLORS[s.competency] || "#64748b";

  return (
    <div
      style={{
        background: "#1e2330", border: `1px solid ${color}30`, borderRadius: 14, padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CompetencyBadge competency={s.competency} />
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", cursor: "pointer", flex: 1 }}
        >
          {s.title}
        </span>
        <button onClick={() => setExpanded((v) => !v)} style={miniBtn("#94a3b8")}>
          {expanded ? "Collapse" : "Expand"}
        </button>
        {!readOnly && <button onClick={onEdit} style={miniBtn("#94a3b8")}>Edit</button>}
        {!readOnly && <button onClick={onDelete} style={miniBtn("#ef4444")}>Delete</button>}
      </div>

      {expanded && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <StarSection label="Situation" text={s.situation} />
          <StarSection label="Task" text={s.task} />
          <StarSection label="Action" text={s.action} />
          <StarSection label="Result" text={s.result} />
        </div>
      )}
    </div>
  );
}

function StarSection({ label, text }) {
  if (!text) return null;
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em", marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "#cbd5e1", whiteSpace: "pre-wrap" }}>{text}</p>
    </div>
  );
}

function miniBtn(color) {
  return {
    padding: "4px 10px", background: "transparent", border: `1px solid ${color}50`,
    borderRadius: 8, color, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  };
}

function StoryForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      style={{
        background: "#1e2330", border: "1px solid #6366f160", borderRadius: 14,
        padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label="Title *">
          <input
            style={inputStyle}
            value={form.title}
            onChange={set("title")}
            placeholder="The payment outage we turned into a postmortem culture"
            autoFocus
          />
        </Field>
        <Field label="Competency">
          <select style={inputStyle} value={form.competency} onChange={set("competency")}>
            {COMPETENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Situation — context, stakes, who was involved">
        <textarea style={textareaStyle} value={form.situation} onChange={set("situation")} />
      </Field>
      <Field label="Task — what was YOUR responsibility">
        <textarea style={textareaStyle} value={form.task} onChange={set("task")} />
      </Field>
      <Field label="Action — what you specifically did (the longest part)">
        <textarea style={textareaStyle} value={form.action} onChange={set("action")} />
      </Field>
      <Field label="Result — outcome with numbers if possible, and what you learned">
        <textarea style={textareaStyle} value={form.result} onChange={set("result")} />
      </Field>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "8px 16px", background: "transparent", border: "1px solid #2d3748",
            borderRadius: 8, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.title.trim()}
          style={{
            padding: "8px 16px", background: "#6366f1", border: "none", borderRadius: 8,
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: form.title.trim() ? "pointer" : "not-allowed",
            opacity: form.title.trim() ? 1 : 0.5,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.03em" }}>{label}</span>
      {children}
    </label>
  );
}

function PromptDrill({ stories }) {
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [revealed, setRevealed] = useState(false);

  const prompt = PROMPTS[promptIdx];
  const matching = stories.filter((s) => s.competency === prompt.competency);

  const nextPrompt = () => {
    let next = Math.floor(Math.random() * PROMPTS.length);
    if (next === promptIdx) next = (next + 1) % PROMPTS.length;
    setPromptIdx(next);
    setRevealed(false);
  };

  return (
    <div>
      <div
        style={{
          background: "#1a1f2e", border: "1px solid #2d3748", borderRadius: 14, padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <CompetencyBadge competency={prompt.competency} />
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: "#f1f5f9" }}>
          "{prompt.text}"
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: "#64748b" }}>
          Answer out loud — aim for 90 seconds, Action should be the longest part.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => setRevealed(true)}
            disabled={revealed}
            style={{
              padding: "9px 18px", background: "#6366f1", border: "none", borderRadius: 8,
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: revealed ? "default" : "pointer", opacity: revealed ? 0.5 : 1,
            }}
          >
            Reveal my stories
          </button>
          <button
            onClick={nextPrompt}
            style={{
              padding: "9px 18px", background: "transparent", border: "1px solid #2d3748",
              borderRadius: 8, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Next prompt →
          </button>
        </div>
      </div>

      {revealed && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {matching.length === 0 ? (
            <p style={{ color: "#fbbf24", fontSize: 13, textAlign: "center" }}>
              ⚠️ No story tagged "{prompt.competency}" yet — that's a gap an interviewer will find first. Write one.
            </p>
          ) : (
            matching.map((s) => <StoryCard key={s.id} story={s} readOnly />)
          )}
        </div>
      )}
    </div>
  );
}
