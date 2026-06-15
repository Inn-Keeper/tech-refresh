import React, { useState } from "react";
import { COMPETENCIES, COMPETENCY_COLORS } from "@tech-refresh/core/stories";
import { colors } from "@tech-refresh/core/tokens";
import { Combobox } from "../Combobox";
import { inputStyle, textareaStyle } from "./styles";
import { EMPTY_FORM } from "./types";
import type { StoryForm as StoryFormType } from "./types";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, letterSpacing: "0.03em" }}>{label}</span>
      {children}
    </label>
  );
}

export function StoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<StoryFormType>;
  onSave: (form: StoryFormType) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<StoryFormType>({ ...EMPTY_FORM, ...initial });
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.accent}60`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
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
        <Combobox
          label="Competency"
          value={form.competency}
          options={COMPETENCIES.map((competency) => ({
            value: competency,
            label: competency,
            color: COMPETENCY_COLORS[competency],
          }))}
          onChange={(competency) => setForm((f) => ({ ...f, competency }))}
        />
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
            padding: "8px 16px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={!form.title.trim()}
          style={{
            padding: "8px 16px",
            background: colors.accent,
            border: "none",
            borderRadius: 8,
            color: colors.onAccent,
            fontSize: 13,
            fontWeight: 600,
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
