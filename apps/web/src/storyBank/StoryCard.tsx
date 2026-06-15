import React, { useState } from "react";
import { COMPETENCY_COLORS } from "@tech-refresh/core/stories";
import { colors } from "@tech-refresh/core/tokens";
import { CompetencyBadge } from "./CompetencyBadge";
import { miniBtn } from "./styles";
import type { Story } from "./types";

function StarSection({ label, text }: { label: string; text: string }) {
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

export function StoryCard({
  story: s,
  onEdit,
  onDelete,
  readOnly,
}: {
  story: Story;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = COMPETENCY_COLORS[s.competency] || colors.textFaint;

  return (
    <div style={{ background: colors.surface, border: `1px solid ${color}30`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CompetencyBadge competency={s.competency} />
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ fontSize: 14, fontWeight: 600, color: colors.textBright, cursor: "pointer", flex: 1 }}
        >
          {s.title}
        </span>
        <button onClick={() => setExpanded((v) => !v)} style={miniBtn(colors.textDim ?? "")}>
          {expanded ? "Collapse" : "Expand"}
        </button>
        {!readOnly && <button onClick={onEdit} style={miniBtn(colors.textDim ?? "")}>Edit</button>}
        {!readOnly && <button onClick={onDelete} style={miniBtn(colors.danger ?? "")}>Delete</button>}
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
