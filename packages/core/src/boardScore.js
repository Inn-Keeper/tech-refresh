// Board readiness combines the deterministic topology check with a separate,
// assessed reasoning grade. Talk-track coverage and self-rating are useful
// practice signals, but neither is a quality assessment.

/** Board percentages are always 0–100; anything else is a caller bug. */
const clampPercent = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

const validGrade = (value) =>
  Number.isFinite(value) && value >= 0 && value <= 100 ? Math.round(value) : null;

/**
 * @param {object} args
 * @param {number} args.topology evaluate() score, 0-100
 * @param {number | null} [args.talkGrade] assessed reasoning grade, if available
 * @returns {{ topology: number, talk: number | null, overall: number | null }}
 */
export function scoreBoard({ topology, talkGrade }) {
  const topologyScore = clampPercent(topology);
  const talk = validGrade(talkGrade);
  return {
    topology: topologyScore,
    talk,
    overall: talk === null ? null : Math.round((topologyScore + talk) / 2),
  };
}
