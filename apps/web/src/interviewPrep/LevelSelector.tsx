import { DIFFICULTIES } from "@tech-refresh/core/difficulty";
import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../BrandIcon";
import { WorkspacePanel, WorkspaceTitle } from "../WorkspaceLayout";
import { DifficultyIcon } from "./DifficultyIcon";

// Sidebar difficulty picker. Sets the global level that drives both the quiz
// cards and the drill, so the whole screen runs at one tier.
export function LevelSelector({ level, onLevel }: { level: string; onLevel: (key: string) => void }) {
  return (
    <WorkspacePanel>
      <WorkspaceTitle
        icon={<BrandIcon name="drill" color={colors.accentBright} size={17} />}
        title="Difficulty level"
        subtitle="Applies to quiz cards and drills."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
        {DIFFICULTIES.map((d) => {
          const active = d.key === level;
          return (
            <button
              key={d.key}
              onClick={() => onLevel(d.key)}
              aria-pressed={active}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textAlign: "left",
                padding: "9px 11px",
                background: active ? `${d.color}24` : "transparent",
                border: `1px solid ${active ? d.color : colors.border}`,
                borderRadius: 9,
                cursor: "pointer",
              }}
            >
              <DifficultyIcon tier={d} size={18} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: active ? d.color : colors.text }}>{d.label}</span>
                <span style={{ display: "block", fontSize: 10.5, color: colors.textFaint }}>{d.blurb}</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: active ? d.color : colors.textFaint }}>+{d.xp}</span>
            </button>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}
