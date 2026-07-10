// Mock interview loop: one timed session composed from existing pieces —
// N quiz questions + 1 Arch Board scenario + 1 behavioral prompt — scored as a
// single "loop". Pure composition: no new content lives here.

export const STORY_RATING_MAX = 5;

/**
 * Picks the design and behavioral rounds for a loop.
 * @param {{ scenarios: { id: string }[], prompts: { competency: string, text: string }[], rng?: () => number }} args
 */
export function composeMockLoop({ scenarios, prompts, rng = Math.random }) {
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  return { scenario: pick(scenarios), prompt: pick(prompts) };
}

/**
 * Composite loop score, 0-100. Rounds the candidate skipped (null) drop out of
 * the average rather than scoring zero — a skipped round is unknown, not failed.
 * @param {object} args
 * @param {number} args.quizCorrect
 * @param {number} args.quizTotal
 * @param {number | null} [args.archScore] Arch Board evaluation score, 0-100
 * @param {number | null} [args.storyRating] self-rating, 1..STORY_RATING_MAX
 * @returns {{ overall: number | null, quiz: number | null, arch: number | null, story: number | null }}
 */
export function scoreMockLoop({ quizCorrect = 0, quizTotal = 0, archScore = null, storyRating = null }) {
  const quiz = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;
  const arch = archScore !== null ? Math.max(0, Math.min(100, Math.round(archScore))) : null;
  const story = storyRating !== null ? Math.round((storyRating / STORY_RATING_MAX) * 100) : null;

  const parts = [quiz, arch, story].filter((v) => v !== null);
  const overall = parts.length ? Math.round(parts.reduce((s, v) => s + v, 0) / parts.length) : null;

  return { overall, quiz, arch, story };
}
