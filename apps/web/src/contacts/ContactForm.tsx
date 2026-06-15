import React, { useState } from "react";
import { ROLE_POSITIONS, STATUSES, STATUS_STYLES } from "@tech-refresh/core/contacts";
import { colors } from "@tech-refresh/core/tokens";
import { Combobox } from "../components/Combobox";
import { DateInput, Field } from "./shared";
import type { Contact } from "./types";
import { EMPTY_FORM, inputStyle } from "./types";

export function ContactForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Contact>;
  onSave: (form: Omit<Contact, "id" | "retros">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Contact, "id" | "retros">>({ ...EMPTY_FORM, ...initial });
  const set = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Name *">
          <input style={inputStyle} value={form.name} onChange={set("name")} autoFocus />
        </Field>
        <Combobox
          label="Status"
          value={form.status}
          options={STATUSES.map((status) => ({
            value: status,
            label: status,
            color: STATUS_STYLES[status]?.color ?? "",
          }))}
          onChange={(status) => setForm((current) => ({ ...current, status }))}
        />
      </div>
      <Combobox
        label="Role / Position"
        searchable
        value={form.role}
        onChange={(role) => setForm((current) => ({ ...current, role }))}
        placeholder="Start typing a role..."
        options={ROLE_POSITIONS.map((role) => ({ value: role, label: role }))}
      />
      <Field label="Link">
        <input style={inputStyle} value={form.link} onChange={set("link")} placeholder="https://..." />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label="Note">
          <input style={inputStyle} value={form.note} onChange={set("note")} />
        </Field>
        <Field label="Date">
          <DateInput value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <Field label="Next action - what's the next move?">
          <input
            style={inputStyle}
            value={form.nextAction}
            onChange={set("nextAction")}
            placeholder="Chase for feedback / send thank-you note / prep round 2..."
          />
        </Field>
        <Field label="Due">
          <DateInput
            value={form.nextActionDate}
            onChange={(nextActionDate) => setForm((current) => ({ ...current, nextActionDate }))}
          />
        </Field>
      </div>

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
          disabled={!form.name.trim()}
          style={{
            padding: "8px 16px",
            background: colors.accent,
            border: "none",
            borderRadius: 8,
            color: colors.onAccent,
            fontSize: 13,
            fontWeight: 600,
            cursor: form.name.trim() ? "pointer" : "not-allowed",
            opacity: form.name.trim() ? 1 : 0.5,
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
