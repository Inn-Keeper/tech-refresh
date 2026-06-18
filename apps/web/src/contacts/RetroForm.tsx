import React, { useState } from "react";
import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";
import { inputStyle, textareaStyle, Field } from "../components/shared";
import type { Retro } from "./types";
import { EMPTY_RETRO } from "./types";

export function RetroLine({ label, text }: { label: string; text?: string }) {
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

export function RetroForm({
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
      <Field label={t("retro.round")}>
        <input
          style={inputStyle}
          value={form.round}
          onChange={set("round")}
          placeholder={t("retro.roundPlaceholder")}
          autoFocus
        />
      </Field>
      <Field label={t("retro.questions")}>
        <textarea style={textareaStyle} value={form.questions} onChange={set("questions")} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label={t("retro.wentWell")}>
          <textarea style={textareaStyle} value={form.wentWell} onChange={set("wentWell")} />
        </Field>
        <Field label={t("retro.toImprove")}>
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
          {t("common.cancel")}
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
          {t("contacts.saveRetro")}
        </button>
      </div>
    </div>
  );
}
