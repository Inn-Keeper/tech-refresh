import React from "react";
import { PROFILE_FIELDS } from "@tech-refresh/core/user";
import { colors, layout, tints } from "@tech-refresh/core/tokens";
import { Field, inputStyle } from "./shared";
import type { ProfileForm, ProfileRecord } from "./types";

export function ProfileFormSection({
  error,
  form,
  githubLinked,
  isLoading,
  onSave,
  onSetField,
  profile,
  savePending,
  saveSuccess,
}: {
  error: Error | null;
  form: ProfileForm;
  githubLinked: boolean;
  isLoading: boolean;
  onSave: (event: React.FormEvent) => void;
  onSetField: (key: string) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  profile: ProfileRecord | null;
  savePending: boolean;
  saveSuccess: boolean;
}) {
  return (
    <section
      style={{
        minWidth: 0,
        flex: "1 1 680px",
        minHeight: `calc(100vh - ${layout.webHeaderHeight}px)`,
        padding: "56px clamp(28px, 6vw, 96px)",
        overflow: "auto",
      }}
    >
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 10 }}>
          <div>
            <p style={{ margin: "0 0 8px", color: colors.textFaint, fontSize: 13, fontWeight: 700 }}>Account</p>
            <h2 style={{ margin: 0, fontSize: 34, lineHeight: 1.12, fontWeight: 800, color: colors.textBright }}>
              Profile settings
            </h2>
          </div>
          {isLoading && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: colors.textFaint, fontWeight: 600 }}>
              loading...
            </span>
          )}
        </div>
        <p style={{ maxWidth: 760, margin: "0 0 30px", color: colors.textDim, fontSize: 15, lineHeight: 1.7 }}>
          Manage the private identity, goals, and links that travel with your interview prep and hiring pipeline.
        </p>

        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 14px",
              background: tints.dangerSoft,
              border: `1px solid ${colors.danger}60`,
              borderRadius: 8,
              color: colors.dangerBright,
              fontSize: 13,
            }}
          >
            {error.message}
          </div>
        )}

        {githubLinked && (
          <div
            style={{
              marginBottom: 18,
              padding: "12px 14px",
              background: tints.successSoft,
              border: `1px solid ${colors.success}60`,
              borderRadius: 8,
              color: colors.successBright,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            GitHub connected to this workspace.
          </div>
        )}

        <form
          onSubmit={onSave}
          style={{
            borderTop: `1px solid ${colors.border}`,
            borderBottom: `1px solid ${colors.border}`,
            padding: "24px 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <Field label="Email">
            <input value={profile?.email ?? ""} readOnly style={{ ...inputStyle, color: colors.textDim }} />
          </Field>

          {PROFILE_FIELDS.map((field) => (
            <Field key={field.key} label={field.label}>
              <input
                value={form[field.key] ?? ""}
                onChange={onSetField(field.key)}
                placeholder={field.placeholder}
                style={inputStyle}
              />
            </Field>
          ))}

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            {saveSuccess && (
              <span style={{ alignSelf: "center", color: colors.successBright, fontSize: 12, fontWeight: 700 }}>Saved</span>
            )}
            <button
              type="submit"
              disabled={savePending || !profile}
              style={{
                padding: "10px 18px",
                background: colors.accent,
                border: "none",
                borderRadius: 8,
                color: colors.onAccent,
                fontSize: 13,
                fontWeight: 800,
                cursor: savePending ? "wait" : "pointer",
                opacity: savePending || !profile ? 0.6 : 1,
              }}
            >
              {savePending ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
