import { RANKS, rankForXp } from "@tech-refresh/core/gamification";
import { difficultyByKey } from "@tech-refresh/core/difficulty";
import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../BrandIcon";
import { WorkspacePanel, WorkspaceTitle } from "../WorkspaceLayout";
import { AccuracyChart } from "../AccuracyChart";
import { ACCURACY_GOOD_PCT, type AccuracyPoint, type Scores, type Summary } from "./types";
import { DifficultyIcon } from "./DifficultyIcon";
import { LevelSelector } from "./LevelSelector";
import { QuizSizeSelector } from "./QuizSizeSelector";

export function PrepRightRail({ accuracy, drillActive, drillLoading, drillError, level, onLevel, onDrill, scores, summary, quizSize, poolSize, onQuizSize }: {
  accuracy: AccuracyPoint[];
  drillActive: boolean;
  drillLoading: boolean;
  drillError: string | null;
  level: string;
  onLevel: (key: string) => void;
  onDrill: () => void;
  scores: Scores;
  summary: Summary;
  quizSize: number | null;
  poolSize: number | null;
  onQuizSize: (v: number | null) => void;
}) {
  const rank = rankForXp(scores.xp) ?? RANKS[0]!;
  const next = RANKS[RANKS.indexOf(rank) + 1];
  const progress = next ? Math.round(((scores.xp - rank.min) / (next.min - rank.min)) * 100) : 100;
  const strongest = summary.ranked.slice(0, 4);
  const weakest = [...summary.ranked].reverse().slice(0, 4);
  const tier = difficultyByKey(level);

  return (
    <>
      <LevelSelector level={level} onLevel={onLevel} />
      <QuizSizeSelector quizSize={quizSize} poolSize={poolSize} onQuizSize={onQuizSize} />

      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="rank" color={colors.accentBright} size={17} />}
          title={rank.name}
          subtitle={`${scores.xp} XP earned`}
          right={
            <span style={{ color: summary.accuracy !== null && summary.accuracy >= ACCURACY_GOOD_PCT ? colors.successBright : colors.warningBright, fontSize: 12, fontWeight: 850 }}>
              {summary.accuracy === null ? "--" : `${summary.accuracy}%`}
            </span>
          }
        />
        <div style={{ height: 7, background: colors.well, borderRadius: 999, overflow: "hidden", marginTop: 14 }}>
          <div style={{ width: `${progress}%`, height: "100%", background: colors.accent }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 9, color: colors.textFaint, fontSize: 11 }}>
          <span>{summary.attempts} answered</span>
          <span>{next ? `${next.min - scores.xp} XP to ${next.name}` : "Top rank"}</span>
        </div>
        <button
          onClick={onDrill}
          disabled={drillActive || drillLoading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginTop: 14,
            padding: "9px 12px",
            background: `${tier?.color ?? colors.accent}1F`,
            border: `1px solid ${tier?.color ?? colors.accent}60`,
            borderRadius: 8,
            color: tier?.color ?? colors.accentBright,
            fontSize: 12,
            fontWeight: 800,
            cursor: drillActive || drillLoading ? "default" : "pointer",
            opacity: drillActive || drillLoading ? 0.55 : 1,
          }}
        >
          <BrandIcon name="drill" color={tier?.color ?? colors.accentBright} size={14} />
          {drillLoading ? "Loading…" : <>Drill weakest · <DifficultyIcon tier={tier} size={13} /> {tier?.label ?? ""}</>}
        </button>
        {drillError && <p style={{ margin: "8px 0 0", fontSize: 11, color: colors.warning }}>{drillError}</p>}
      </WorkspacePanel>

      <AccuracyChart points={accuracy} compact />

      <WorkspacePanel>
        <WorkspaceTitle
          icon={<BrandIcon name="accuracy" color={colors.successBright} size={17} />}
          title="Signal"
          subtitle="Use this to choose what to rehearse next."
        />
        <RailList title="Strongest" icon="arrowUp" items={strongest} color={colors.successBright ?? ""} />
        <RailList title="Needs reps" icon="arrowDown" items={weakest} color={colors.warningBright ?? ""} />
      </WorkspacePanel>
    </>
  );
}

function RailList({ color, icon, items, title }: { color: string; icon: string; items: { tech: string; acc: number; n: number }[]; title: string }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: colors.textDim, fontSize: 11, fontWeight: 800, marginBottom: 8 }}>
        <BrandIcon name={icon} color={color} size={12} />
        {title}
      </div>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: colors.textFaint, fontSize: 11, lineHeight: 1.5 }}>Answer a few questions to build a signal.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map((item) => (
            <div key={item.tech} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span style={{ color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.tech}</span>
              <span style={{ color, fontWeight: 800 }}>{item.acc}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
