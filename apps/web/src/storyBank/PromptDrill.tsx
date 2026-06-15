import React, { useState } from "react";
import { PROMPTS } from "@tech-refresh/core/stories";
import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../components/BrandIcon";
import { CompetencyBadge } from "./CompetencyBadge";
import { StoryCard } from "./StoryCard";
import type { Story } from "./types";

type Prompt = { text: string; competency: string };

export function PromptDrill({ stories }: { stories: Story[] }) {
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [revealed, setRevealed] = useState(false);

  const prompt = PROMPTS[promptIdx] as Prompt | undefined;
  const matching = stories.filter((s) => s.competency === prompt?.competency);

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
          background: colors.well,
          border: `1px solid ${colors.border}`,
          borderRadius: 14,
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <CompetencyBadge competency={prompt?.competency ?? ""} />
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: colors.textBright }}>
          "{prompt?.text}"
        </p>
        <p style={{ margin: "0 0 20px", fontSize: 12, color: colors.textFaint }}>
          Answer out loud — aim for 90 seconds, Action should be the longest part.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => setRevealed(true)}
            disabled={revealed}
            style={{
              padding: "9px 18px",
              background: colors.accent,
              border: "none",
              borderRadius: 8,
              color: colors.onAccent,
              fontSize: 13,
              fontWeight: 600,
              cursor: revealed ? "default" : "pointer",
              opacity: revealed ? 0.5 : 1,
            }}
          >
            Reveal my stories
          </button>
          <button
            onClick={nextPrompt}
            style={{
              padding: "9px 18px",
              background: "transparent",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              color: colors.textDim,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Next prompt →
          </button>
        </div>
      </div>

      {revealed && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {matching.length === 0 ? (
            <p
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                color: colors.warningBright,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              <BrandIcon name="warning" color={colors.warningBright} size={14} />
              <span>
                No story tagged "{prompt?.competency}" yet — that's a gap an interviewer will find first. Write one.
              </span>
            </p>
          ) : (
            matching.map((s) => <StoryCard key={s.id} story={s} readOnly />)
          )}
        </div>
      )}
    </div>
  );
}
