import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../BrandIcon";
import { WorkspacePanel, WorkspaceTitle } from "../WorkspaceLayout";

const QUIZ_SIZE_MIN = 3;

// Default upper bound shown before any card is opened. Wide enough to be useful;
// the real pool size will clamp down on first fetch.
const QUIZ_SIZE_DEFAULT_MAX = 20;

export function QuizSizeSelector({ quizSize, poolSize, onQuizSize }: { quizSize: number | null; poolSize: number | null; onQuizSize: (v: number | null) => void }) {
  const isAll = quizSize === null;
  // Slider ceiling: the known pool size, or the stored cap if larger (so the
  // thumb isn't pegged at max when the user picked a cap bigger than the current
  // pool), or the default placeholder when no card has been opened yet.
  const max = Math.max(poolSize ?? QUIZ_SIZE_DEFAULT_MAX, quizSize ?? QUIZ_SIZE_MIN);
  const effective = isAll ? max : Math.min(quizSize, max);

  return (
    <WorkspacePanel>
      <WorkspaceTitle
        icon={<BrandIcon name="layers" color={colors.accentBright} size={17} />}
        title="Questions per card"
        subtitle={poolSize !== null ? `${poolSize} available at this level` : "Open a card to detect pool size."}
      />
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: colors.textBright }}>{isAll ? "All" : effective}</span>
          <button
            type="button"
            onClick={() => onQuizSize(null)}
            disabled={isAll}
            style={{
              padding: "3px 9px",
              background: "transparent",
              border: `1px solid ${isAll ? colors.accent : colors.border}`,
              borderRadius: 6,
              color: isAll ? colors.accent : colors.textFaint,
              fontSize: 11,
              fontWeight: 800,
              cursor: isAll ? "default" : "pointer",
            }}
          >
            All
          </button>
        </div>
        <input
          type="range"
          min={QUIZ_SIZE_MIN}
          max={Math.max(max, QUIZ_SIZE_MIN)}
          step={1}
          value={effective}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onQuizSize(v >= max ? null : v);
          }}
          style={{ width: "100%", accentColor: colors.accent }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: colors.textFaint, fontSize: 10.5, fontWeight: 700 }}>
          <span>{QUIZ_SIZE_MIN}</span>
          <span>{max > QUIZ_SIZE_MIN ? max : "—"}</span>
        </div>
      </div>
    </WorkspacePanel>
  );
}
