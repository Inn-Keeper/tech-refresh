import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { COMPETENCIES, COMPETENCY_COLORS, PROMPTS } from "@tech-refresh/core/stories";
import * as api from "./api.js";
import { colors, tints } from "@tech-refresh/core/tokens";
import { BrandIcon } from "./BrandIcon.jsx";
import { WorkspaceLayout, WorkspacePanel, WorkspaceTitle } from "./WorkspaceLayout.jsx";

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
  background: colors.bgDeep,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  color: colors.text,
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
  const storyList = stories ?? [];

  return (
    <WorkspaceLayout
      mainLabel="Story bank"
      left={
        <StoryLeftRail
          canAdd={!!stories && editingId !== "new"}
          mode={mode}
          onAdd={() => setEditingId("new")}
          setMode={setMode}
          stories={storyList}
        />
      }
      right={<StoryCoverage stories={storyList} />}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 850, color: colors.textBright }}>
          {mode === "drill" ? "Drill prompts" : "Story Bank"}
        </h1>
        <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 500 }}>
          {stories ? `${stories.length} stories` : "loading…"}
        </span>
      </div>
      <p style={{ margin: "0 0 20px", color: colors.textFaint, fontSize: 13, maxWidth: 760, lineHeight: 1.6 }}>
        Your STAR stories for behavioral interviews. Aim for 8–10 covering different competencies — one
        real story can serve several prompts.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16, padding: "10px 14px", background: tints.dangerSoft,
            border: `1px solid ${colors.danger}60`, borderRadius: 10, color: colors.dangerBright, fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {mode === "drill" ? (
        <PromptDrill stories={stories || []} />
      ) : (
        <>
          {editingId === "new" && (
            <div style={{ marginBottom: 16 }}>
              <StoryForm initial={EMPTY_FORM} onSave={handleSave} onCancel={() => setEditingId(null)} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stories?.length === 0 && editingId !== "new" && (
              <p style={{ color: colors.textFaint, fontSize: 13, textAlign: "center", marginTop: 24 }}>
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
    </WorkspaceLayout>
  );
}

function StoryLeftRail({ canAdd, mode, onAdd, setMode, stories }) {
  return (
    <>
      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="story" color={colors.accentBright} size={17} />}
          title="Behavioral prep"
          subtitle={`${stories.length} saved stories. Keep the center for writing and rehearsing.`}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
          {[
            { id: "stories", icon: "story", label: "My stories" },
            { id: "drill", icon: "prompt", label: "Drill prompts" },
          ].map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setMode(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 10px",
                  border: "none",
                  borderRadius: 7,
                  background: active ? tints.accentSoft : "transparent",
                  color: active ? colors.accentBright : colors.textDim,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <BrandIcon name={item.icon} color={active ? colors.accentBright : colors.textFaint} size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      </WorkspacePanel>

      <WorkspacePanel tone="sunken">
        <WorkspaceTitle
          icon={<BrandIcon name="spark" color={colors.warningBright} size={17} />}
          title="Next useful action"
          subtitle={mode === "stories" ? "Write one specific story, then reuse it across prompts." : "Answer out loud before revealing matching stories."}
        />
        {canAdd && (
          <button
            onClick={onAdd}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "9px 12px",
              background: colors.accent,
              border: "none",
              borderRadius: 8,
              color: colors.onAccent,
              fontSize: 12,
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Add story
          </button>
        )}
      </WorkspacePanel>
    </>
  );
}

function StoryCoverage({ stories }) {
  const counts = Object.fromEntries(COMPETENCIES.map((competency) => [competency, stories.filter((s) => s.competency === competency).length]));
  const covered = COMPETENCIES.filter((competency) => counts[competency] > 0).length;

  return (
    <WorkspacePanel>
      <WorkspaceTitle
        icon={<BrandIcon name="accuracy" color={colors.successBright} size={17} />}
        title="Coverage"
        subtitle={`${covered}/${COMPETENCIES.length} competencies have at least one story.`}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {COMPETENCIES.map((competency) => {
          const color = COMPETENCY_COLORS[competency] || colors.textFaint;
          return (
            <div key={competency} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: counts[competency] ? color : colors.border }} />
              <span style={{ flex: 1, color: counts[competency] ? colors.text : colors.textFaint }}>{competency}</span>
              <span style={{ color: counts[competency] ? color : colors.textFaint, fontWeight: 850 }}>{counts[competency]}</span>
            </div>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}

function CompetencyBadge({ competency }) {
  const color = COMPETENCY_COLORS[competency] || colors.textFaint;
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
  const color = COMPETENCY_COLORS[s.competency] || colors.textFaint;

  return (
    <div
      style={{
        background: colors.surface, border: `1px solid ${color}30`, borderRadius: 14, padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CompetencyBadge competency={s.competency} />
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: 14, fontWeight: 600, color: colors.textBright, cursor: "pointer", flex: 1 }}
        >
          {s.title}
        </span>
        <button onClick={() => setExpanded((v) => !v)} style={miniBtn(colors.textDim)}>
          {expanded ? "Collapse" : "Expand"}
        </button>
        {!readOnly && <button onClick={onEdit} style={miniBtn(colors.textDim)}>Edit</button>}
        {!readOnly && <button onClick={onDelete} style={miniBtn(colors.danger)}>Delete</button>}
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
      <div style={{ fontSize: 10, fontWeight: 700, color: colors.textFaint, letterSpacing: "0.08em", marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: colors.text, whiteSpace: "pre-wrap" }}>{text}</p>
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
        background: colors.surface, border: `1px solid ${colors.accent}60`, borderRadius: 14,
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
            padding: "8px 16px", background: "transparent", border: `1px solid ${colors.border}`,
            borderRadius: 8, color: colors.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.title.trim()}
          style={{
            padding: "8px 16px", background: colors.accent, border: "none", borderRadius: 8,
            color: colors.onAccent, fontSize: 13, fontWeight: 600,
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
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, letterSpacing: "0.03em" }}>{label}</span>
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
          background: colors.well, border: `1px solid ${colors.border}`, borderRadius: 14, padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <CompetencyBadge competency={prompt.competency} />
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: colors.textBright }}>
          "{prompt.text}"
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: colors.textFaint }}>
          Answer out loud — aim for 90 seconds, Action should be the longest part.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => setRevealed(true)}
            disabled={revealed}
            style={{
              padding: "9px 18px", background: colors.accent, border: "none", borderRadius: 8,
              color: colors.onAccent, fontSize: 13, fontWeight: 600,
              cursor: revealed ? "default" : "pointer", opacity: revealed ? 0.5 : 1,
            }}
          >
            Reveal my stories
          </button>
          <button
            onClick={nextPrompt}
            style={{
              padding: "9px 18px", background: "transparent", border: `1px solid ${colors.border}`,
              borderRadius: 8, color: colors.textDim, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Next prompt →
          </button>
        </div>
      </div>

      {revealed && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {matching.length === 0 ? (
            <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color: colors.warningBright, fontSize: 13, textAlign: "center" }}>
              <BrandIcon name="warning" color={colors.warningBright} size={14} />
              <span>No story tagged "{prompt.competency}" yet — that's a gap an interviewer will find first. Write one.</span>
            </p>
          ) : (
            matching.map((s) => <StoryCard key={s.id} story={s} readOnly />)
          )}
        </div>
      )}
    </div>
  );
}
