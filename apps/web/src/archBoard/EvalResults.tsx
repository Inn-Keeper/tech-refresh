import { t } from "@tech-refresh/core/i18n";
import { colors } from "@tech-refresh/core/tokens";
import { BrandIcon } from "../components/BrandIcon";
import {
  MAINT_LEAN_MAX,
  MAINT_MODERATE_MAX,
  REVIEW_SCORE,
  SHIP_SCORE,
} from "./constants";
import type { AugmentedScenario } from "./types";

type EvalResult = {
  score: number;
  cost: number;
  maint: number;
  checks: { label: string; passed: boolean; points: number }[];
  warnings: string[];
};

export function EvalResults({ result, scenario }: { result: EvalResult; scenario: AugmentedScenario }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: "18px 20px",
        background: colors.well,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: result.score >= SHIP_SCORE ? colors.success : result.score >= REVIEW_SCORE ? colors.warning : colors.danger,
          }}
        >
          {result.score}%
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.textBright }}>
          {result.score >= SHIP_SCORE
            ? t("board.verdictShip")
            : result.score >= REVIEW_SCORE
              ? t("board.verdictReview")
              : t("board.verdictWhiteboard")}
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            color: colors.textDim,
          }}
        >
          <BrandIcon name="cost" color={colors.textDim} size={14} />
          {result.cost}/{scenario.budget} ·
          <BrandIcon name="maintenance" color={colors.textDim} size={14} />
          maint {result.maint} (
          {result.maint <= MAINT_LEAN_MAX ? "lean" : result.maint <= MAINT_MODERATE_MAX ? "moderate" : "heavy"})
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, marginBottom: 8, letterSpacing: "0.04em" }}>
            DESIGN CHECKS
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {result.checks.map((check) => (
              <li
                key={check.label}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 7,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: check.passed ? colors.successBright : colors.dangerBright,
                }}
              >
                <BrandIcon
                  name={check.passed ? "check" : "error"}
                  color={check.passed ? colors.successBright : colors.dangerBright}
                  size={14}
                />
                <span style={{ flex: 1 }}>
                  {check.label} <span style={{ color: colors.textFaint }}>({check.points} pts)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {result.warnings.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textDim, marginBottom: 8, letterSpacing: "0.04em" }}>
              MEETING NOTES
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
              {result.warnings.map((warning) => (
                <li
                  key={warning}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 7,
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    color: colors.warningBright,
                  }}
                >
                  <BrandIcon name="warning" color={colors.warningBright} size={14} />
                  <span style={{ flex: 1 }}>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
