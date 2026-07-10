// Spaced repetition over normalized answer_events — no extra tables.
// A tech is a "card": its consecutive-correct streak (ending at the latest
// answer) picks a review interval; the tech is due once that interval has
// passed since the last answer. A wrong answer resets the streak, so the tech
// comes back the next day.
// ponytail: SM-2-lite with fixed doubling intervals; per-question scheduling
// and ease factors only if the per-tech granularity proves too coarse.

/**
 * @typedef {object} ReviewEntry
 * @property {string} tech
 * @property {number} streak consecutive correct answers ending at the latest event
 * @property {number} intervalDays
 * @property {number} dueAt epoch ms
 * @property {boolean} due
 */

export const REVIEW_INTERVALS_DAYS = [1, 2, 4, 8, 16, 32];

const DAY_MS = 86_400_000;

/** @param {number} streak consecutive correct answers ending at the latest event */
export function reviewIntervalDays(streak) {
  return REVIEW_INTERVALS_DAYS[Math.min(streak, REVIEW_INTERVALS_DAYS.length - 1)];
}

/**
 * Builds the per-tech review schedule from raw answer events.
 * Only attempted techs appear — never-seen techs are "new", not "due".
 *
 * @param {Array<{ tech: string, correct: boolean, createdAt?: string, created_at?: string }>} events
 * @param {Date} [now]
 * @returns {ReviewEntry[]} due techs first (most overdue leading), then upcoming by dueAt
 */
export function buildReviewQueue(events = [], now = new Date()) {
  const sorted = events
    .map((event) => ({ event, time: new Date(event.createdAt ?? event.created_at).getTime() }))
    .filter(({ time }) => !Number.isNaN(time))
    .sort((a, b) => a.time - b.time);

  const byTech = new Map();
  for (const { event, time } of sorted) {
    const entry = byTech.get(event.tech) ?? { streak: 0, lastTime: 0 };
    entry.streak = event.correct ? entry.streak + 1 : 0;
    entry.lastTime = time;
    byTech.set(event.tech, entry);
  }

  const nowMs = now.getTime();
  return [...byTech.entries()]
    .map(([tech, { streak, lastTime }]) => {
      const intervalDays = reviewIntervalDays(streak);
      const dueAt = lastTime + intervalDays * DAY_MS;
      return { tech, streak, intervalDays, dueAt, due: dueAt <= nowMs };
    })
    .sort((a, b) => a.dueAt - b.dueAt);
}
