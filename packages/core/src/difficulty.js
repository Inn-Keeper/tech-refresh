// Quiz difficulty tiers — single source of truth for both apps.
// Sassy, player-facing names; each tier carries its own XP reward so harder
// questions are worth more. Colors reuse existing design tokens (no new ones).
//
// XP note: tiered questions award `tier.xp`; the flat CORRECT_XP in
// gamification.js still applies to the per-tech flip cards, which have no tier.
import { colors } from "./tokens.js";

/**
 * @typedef {object} Difficulty
 * @property {"easy"|"mid"|"high"|"ultra"} key
 * @property {string} label   Player-facing name
 * @property {string} emoji
 * @property {string} color   Token color for the tier
 * @property {string} blurb   One-line vibe shown under the label
 * @property {number} xp      XP awarded per correct answer at this tier
 */

/** @type {Difficulty[]} Ordered easy → hardest. */
export const DIFFICULTIES = [
  { key: "easy", label: "Newbie", emoji: "🐣", color: colors.success, blurb: "Just hatched. Warm up the basics.", xp: 5 },
  { key: "mid", label: "Can-Do", emoji: "😎", color: colors.accent, blurb: "You know the drill. Prove it.", xp: 10 },
  { key: "high", label: "Full Speed", emoji: "🔥", color: colors.warning, blurb: "No training wheels. Hot questions.", xp: 20 },
  { key: "ultra", label: "Overlord", emoji: "💀", color: colors.deco6, blurb: "Senior-killer mode. Good luck.", xp: 40 },
];

/** @type {("easy"|"mid"|"high"|"ultra")[]} */
export const DIFFICULTY_KEYS = DIFFICULTIES.map((d) => d.key);

/**
 * Look up a tier by key. Returns undefined for unknown keys — callers that need
 * a fallback should handle it explicitly rather than guessing a tier.
 * @param {string} key
 * @returns {Difficulty | undefined}
 */
export const difficultyByKey = (key) => DIFFICULTIES.find((d) => d.key === key);
