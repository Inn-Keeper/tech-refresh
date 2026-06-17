import React from "react";
import { colors } from "@tech-refresh/core/tokens";
import { t } from "@tech-refresh/core/i18n";
import { inputStyle } from "./types";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: colors.textFaint, letterSpacing: "0.03em" }}>{label}</span>
      {children}
    </label>
  );
}

export function ActionButton({
  onClick,
  color,
  children,
}: {
  onClick: () => void;
  color: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        background: "transparent",
        border: `1px solid ${color}50`,
        borderRadius: 8,
        color,
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      style={inputStyle}
      value={value}
      inputMode="numeric"
      maxLength={10}
      onChange={(e) => onChange(formatDateEntry(e.target.value))}
      placeholder={t("contacts.datePlaceholder")}
    />
  );
}

function formatDateEntry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}
