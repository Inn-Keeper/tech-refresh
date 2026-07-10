// Targeted prep plan: diff a job posting's tech stack against quiz accuracy.
// Posting techs come from extractTechsFromText (same detector the CV import
// uses); this module only ranks them and anchors the plan to the interview date.

import { parseDDMMYYYY } from "./contacts.js";

const DAY_MS = 86_400_000;

/**
 * Ranks a posting's techs weakest-first: never-attempted techs lead (unknown =
 * highest interview risk), then attempted techs by ascending accuracy.
 *
 * @param {object} args
 * @param {string[]} args.techs posting techs (from extractTechsFromText)
 * @param {Record<string, { correct: number, wrong: number }>} args.answers
 * @param {string} [args.deadline] interview date, DD-MM-YYYY
 * @returns {{ items: { tech: string, attempts: number, accuracy: number | null }[], daysLeft: number | null }}
 */
export function buildPrepPlan({ techs = [], answers = {}, deadline = "" }) {
  const items = techs
    .map((tech) => {
      const s = answers[tech];
      const attempts = s ? s.correct + s.wrong : 0;
      const accuracy = attempts > 0 ? Math.round((s.correct / attempts) * 100) : null;
      return { tech, attempts, accuracy };
    })
    .sort(
      (a, b) =>
        (a.accuracy ?? -1) - (b.accuracy ?? -1) ||
        a.attempts - b.attempts ||
        a.tech.localeCompare(b.tech)
    );

  const due = deadline ? parseDDMMYYYY(deadline) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = due ? Math.max(0, Math.round((due.getTime() - today.getTime()) / DAY_MS)) : null;

  return { items, daysLeft };
}
