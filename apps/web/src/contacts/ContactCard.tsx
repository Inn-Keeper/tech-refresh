import React, { useState } from "react";
import { STATUSES, STATUS_STYLES, isDue } from "@tech-refresh/core/contacts";
import { colors, tints } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../components/BrandIcon";
import { ActionButton } from "./shared";
import type { Contact, Retro } from "./types";
import { EMPTY_RETRO, inputStyle, textareaStyle } from "./types";
import { Field } from "./shared";

function RetroLine({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: colors.textFaint, letterSpacing: "0.06em" }}>
        {label.toUpperCase()}:{" "}
      </span>
      <span style={{ fontSize: 12.5, color: colors.textDim, whiteSpace: "pre-wrap" }}>{text}</span>
    </div>
  );
}

function RetroForm({
  onSave,
  onCancel,
}: {
  onSave: (retro: Omit<Retro, "id" | "date">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Omit<Retro, "id" | "date">>(EMPTY_RETRO);
  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div
      style={{
        marginTop: 10,
        padding: "12px 14px",
        background: colors.well,
        border: `1px solid ${colors.accent}60`,
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Field label="Round">
        <input
          style={inputStyle}
          value={form.round}
          onChange={set("round")}
          placeholder="Recruiter screen / Tech round / System design…"
          autoFocus
        />
      </Field>
      <Field label="Questions they actually asked">
        <textarea style={textareaStyle} value={form.questions} onChange={set("questions")} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Went well">
          <textarea style={textareaStyle} value={form.wentWell} onChange={set("wentWell")} />
        </Field>
        <Field label="To improve">
          <textarea style={textareaStyle} value={form.toImprove} onChange={set("toImprove")} />
        </Field>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 14px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          style={{
            padding: "6px 14px",
            background: colors.accent,
            border: "none",
            borderRadius: 8,
            color: colors.onAccent,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save retro
        </button>
      </div>
    </div>
  );
}

type ContactCardProps = {
  contact: Contact;
  retroOpen: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAdvance: () => void;
  onClearAction: () => void;
  onOpenRetro: () => void;
  onAddRetro: (retro: Omit<Retro, "id" | "date">) => void;
  onDeleteRetro: (retroId: string) => void;
};

export function ContactCard({
  contact: c,
  retroOpen,
  onEdit,
  onDelete,
  onAdvance,
  onClearAction,
  onOpenRetro,
  onAddRetro,
  onDeleteRetro,
}: ContactCardProps) {
  const [showRetros, setShowRetros] = useState(false);
  const status = STATUS_STYLES[c.status] ?? STATUS_STYLES.Contacted ?? { color: "", bg: "" };
  const nextStatus = STATUSES[STATUSES.indexOf(c.status) + 1];
  const due = isDue(c);
  const retros = c.retros || [];

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${due ? `${colors.danger}80` : `${status.color}30`}`,
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span
          style={{
            padding: "3px 10px",
            background: status.bg,
            borderRadius: 20,
            color: status.color,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {c.status.toUpperCase()}
        </span>
        {c.date && <span style={{ fontSize: 11, color: colors.textFaint }}>{c.date}</span>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {nextStatus && (
            <ActionButton onClick={onAdvance} color={STATUS_STYLES[nextStatus]?.color ?? ""}>
              → {nextStatus}
            </ActionButton>
          )}
          <ActionButton onClick={onOpenRetro} color={colors.accentBright}>
            + Retro
          </ActionButton>
          <ActionButton onClick={onEdit} color={colors.textDim}>
            Edit
          </ActionButton>
          <ActionButton onClick={onDelete} color={colors.danger}>
            Delete
          </ActionButton>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: colors.textBright, marginBottom: 4 }}>{c.name}</div>

      {c.role && (
        <div style={{ fontSize: 13, color: colors.text, marginBottom: 4 }}>
          {c.link ? (
            <a href={c.link} target="_blank" rel="noreferrer" style={{ color: colors.accentBright, textDecoration: "none" }}>
              {c.role} ↗
            </a>
          ) : (
            c.role
          )}
        </div>
      )}

      {c.note && <div style={{ fontSize: 12.5, color: colors.textDim }}>{c.note}</div>}

      {c.nextAction && (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            background: due ? tints.dangerSoft : tints.warningSoft,
            border: `1px solid ${due ? `${colors.danger}60` : `${colors.warning}40`}`,
            borderRadius: 8,
            fontSize: 12.5,
            color: due ? colors.dangerBright : colors.warningBright,
          }}
        >
          <BrandIcon
            name={due ? "warning" : "calendar"}
            color={due ? colors.dangerBright : colors.warningBright}
            size={15}
          />
          <span style={{ flex: 1 }}>
            {due && <span style={{ fontWeight: 600 }}>DUE · </span>}
            {c.nextAction}
            {c.nextActionDate && <span style={{ opacity: 0.7 }}> · {c.nextActionDate}</span>}
          </span>
          <button
            onClick={onClearAction}
            title="Mark done"
            style={{
              padding: "3px 10px",
              background: "transparent",
              border: `1px solid ${due ? `${colors.danger}60` : `${colors.warning}50`}`,
              borderRadius: 6,
              color: "inherit",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      )}

      {retros.length > 0 && (
        <button
          onClick={() => setShowRetros((v) => !v)}
          style={{
            marginTop: 10,
            padding: "4px 10px",
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            color: colors.textDim,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <BrandIcon name="retro" color={colors.textDim} size={12} />
          Retros ({retros.length})
          <BrandIcon name={showRetros ? "arrowUp" : "arrowDown"} color={colors.textDim} size={11} />
        </button>
      )}

      {showRetros &&
        retros.map((r) => (
          <div
            key={r.id}
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: colors.well,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{r.round || "Interview"}</span>
              <span style={{ fontSize: 11, color: colors.textFaint }}>{r.date}</span>
              <button
                onClick={() => r.id && onDeleteRetro(r.id)}
                title="Delete retro"
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <BrandIcon name="close" color={colors.textFaint} size={11} />
              </button>
            </div>
            <RetroLine label="Questions asked" text={r.questions} />
            <RetroLine label="Went well" text={r.wentWell} />
            <RetroLine label="To improve" text={r.toImprove} />
          </div>
        ))}

      {retroOpen && <RetroForm onSave={onAddRetro} onCancel={onOpenRetro} />}
    </div>
  );
}
