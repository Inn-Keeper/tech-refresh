// Design-round clock: a countdown split into the phases a real interview walks.
//
// A stopwatch tells you how long you took. A countdown with phase markers tells
// you when to stop talking about requirements and start drawing — which is the
// habit that actually fails candidates. Phases line up with the talk track
// sections in talkTrack.js, so the running clock can point at what to fill in.

const MS_PER_MINUTE = 60_000;

/**
 * @typedef {object} DesignPhase
 * @property {string} id
 * @property {string} label
 * @property {number} minutes
 * @property {string[]} sectionIds talk-track sections this phase produces
 */

/** @type {DesignPhase[]} */
export const DESIGN_PHASES = [
  { id: "requirements", label: "Scope it", minutes: 5, sectionIds: ["requirements"] },
  { id: "estimate", label: "Do the math", minutes: 5, sectionIds: ["scale"] },
  { id: "highLevel", label: "Draw the boxes", minutes: 10, sectionIds: ["api", "dataModel"] },
  { id: "deepDive", label: "Break something", minutes: 15, sectionIds: ["bottleneck"] },
  { id: "wrap", label: "Defend it", minutes: 5, sectionIds: ["tradeoff"] },
];

export const ROUND_MINUTES = DESIGN_PHASES.reduce((sum, phase) => sum + phase.minutes, 0);
export const ROUND_MS = ROUND_MINUTES * MS_PER_MINUTE;

/** Elapsed time from a possibly-missing or rewound clock, floored at zero. */
const safeElapsed = (elapsedMs) => (Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0);

/**
 * Locates a point in time within the round.
 * Past the final phase the clock stays on it and flags overrun — running long
 * is information, not a reason to show a phase that doesn't exist.
 *
 * @param {number} elapsedMs
 * @returns {{
 *   phase: DesignPhase,
 *   index: number,
 *   phaseElapsedMs: number,
 *   phaseRemainingMs: number,
 *   overrun: boolean,
 * }}
 */
export function phaseAt(elapsedMs) {
  const elapsed = safeElapsed(elapsedMs);

  let phaseStart = 0;
  for (let index = 0; index < DESIGN_PHASES.length; index += 1) {
    const phase = DESIGN_PHASES[index];
    const phaseMs = phase.minutes * MS_PER_MINUTE;
    if (elapsed < phaseStart + phaseMs) {
      const phaseElapsedMs = elapsed - phaseStart;
      return { phase, index, phaseElapsedMs, phaseRemainingMs: phaseMs - phaseElapsedMs, overrun: false };
    }
    phaseStart += phaseMs;
  }

  const index = DESIGN_PHASES.length - 1;
  return {
    phase: DESIGN_PHASES[index],
    index,
    phaseElapsedMs: DESIGN_PHASES[index].minutes * MS_PER_MINUTE,
    phaseRemainingMs: 0,
    overrun: true,
  };
}

/**
 * Whole-round countdown state.
 * @param {number} elapsedMs
 * @returns {{ remainingMs: number, percent: number, overrun: boolean }}
 */
export function roundProgress(elapsedMs) {
  const elapsed = safeElapsed(elapsedMs);
  return {
    remainingMs: Math.max(0, ROUND_MS - elapsed),
    percent: Math.min(100, Math.round((elapsed / ROUND_MS) * 100)),
    overrun: elapsed > ROUND_MS,
  };
}

/**
 * MM:SS, floored so a clock never reads a second it hasn't finished.
 * Negative input renders as overtime.
 * @param {number} ms
 * @returns {string}
 */
export function formatClock(ms) {
  const value = Number.isFinite(ms) ? ms : 0;
  const sign = value < 0 ? "-" : "";
  const totalSeconds = Math.floor(Math.abs(value) / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${sign}${minutes}:${seconds}`;
}
