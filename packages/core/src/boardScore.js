// One board, two halves.
//
// evaluate() scores the diagram: which boxes exist and how they're wired. That
// is genuinely half a design round — and on its own it's the half that's easy
// to fake, because a full-marks topology can be dropped in forty seconds
// without a thought. The other half is the reasoning in talkTrack.js.
//
// Averaging them is deliberate rather than "missing parts drop out" like
// readiness.js does elsewhere: a saved board with no talk track isn't an
// unknown, it's a board where the reasoning was skipped. That's evidence, and
// it should read as half a round, not as an unmeasured one.

import { scoreTalkTrack } from "./talkTrack.js";

/** Board percentages are always 0–100; anything else is a caller bug. */
const clampPercent = (value) =>
  Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0;

/**
 * @param {object} args
 * @param {number} args.topology evaluate() score, 0-100
 * @param {unknown} [args.talkTrack] stored talk track, or null when never written
 * @returns {{ topology: number, talk: number, overall: number }}
 */
export function scoreBoard({ topology, talkTrack }) {
  const topologyScore = clampPercent(topology);
  const talk = clampPercent(scoreTalkTrack(talkTrack).score);
  return {
    topology: topologyScore,
    talk,
    overall: Math.round((topologyScore + talk) / 2),
  };
}
