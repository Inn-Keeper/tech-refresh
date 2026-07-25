// Readiness score: one number per target role, aggregated from prep accuracy
// on that role's stack, STAR story coverage, and Arch Board evaluation scores.
// Parts that can't be computed (no posting techs, no saved boards) are null and
// drop out of the average instead of dragging it to zero.

import { scoreBoard } from "./boardScore.js";
import { COMPETENCIES } from "./stories.js";

const avg = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * @param {object} args
 * @param {string[]} [args.postingTechs] the role's stack (posting-detected techs)
 * @param {Record<string, { correct: number, wrong: number }>} [args.answers]
 * @param {{ competency: string }[]} [args.stories]
 * @param {{ topology: number, talkTrack?: unknown }[]} [args.boards] saved boards,
 *   each scored on both its diagram and the reasoning written alongside it
 * @returns {{
 *   overall: number | null,
 *   prep: number | null,
 *   stories: number,
 *   arch: number | null,
 *   archTopology: number | null,
 *   archTalk: number | null,
 * }}
 */
export function computeReadiness({ postingTechs = [], answers = {}, stories = [], boards = [] }) {
  // Unattempted techs count as 0% — an untested claim is a risk, not a pass.
  const prep = postingTechs.length
    ? Math.round(
        avg(
          postingTechs.map((tech) => {
            const s = answers[tech];
            const attempts = s ? s.correct + s.wrong : 0;
            return attempts > 0 ? (s.correct / attempts) * 100 : 0;
          })
        )
      )
    : null;

  const covered = new Set(stories.map((s) => s.competency).filter((c) => COMPETENCIES.includes(c)));
  const storyCoverage = Math.round((covered.size / COMPETENCIES.length) * 100);

  // Boards report their halves separately so the meter can say *which* half is
  // weak — a wall of perfect diagrams with no reasoning reads as 50, not 100.
  const scored = boards.map(scoreBoard);
  const arch = scored.length ? Math.round(avg(scored.map((b) => b.overall))) : null;
  const archTopology = scored.length ? Math.round(avg(scored.map((b) => b.topology))) : null;
  const archTalk = scored.length ? Math.round(avg(scored.map((b) => b.talk))) : null;

  const parts = [prep, storyCoverage, arch].filter((v) => v !== null);
  const overall = parts.length ? Math.round(avg(parts)) : null;

  return { overall, prep, stories: storyCoverage, arch, archTopology, archTalk };
}
