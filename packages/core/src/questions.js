// Validation for the tiered question bank. The seed script and the content
// test both run this so "valid in the repo" and "valid to seed" can never drift.
import { DIFFICULTY_KEYS } from "./difficulty.js";

const OPTION_COUNT = 4;

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";

/**
 * Checks one question against the seed contract. Returns an array of human-
 * readable problems ([] means valid).
 * @param {object} q
 * @returns {string[]}
 */
export function validateQuestion(q) {
  const errors = [];
  const where = isNonEmptyString(q?.prompt) ? `"${q.prompt.slice(0, 50)}"` : "(no prompt)";
  if (!isNonEmptyString(q?.tech)) errors.push(`${where}: missing tech`);
  if (!isNonEmptyString(q?.category)) errors.push(`${where}: missing category`);
  if (!DIFFICULTY_KEYS.includes(q?.difficulty)) errors.push(`${where}: difficulty must be one of ${DIFFICULTY_KEYS.join("/")}, got "${q?.difficulty}"`);
  if (!isNonEmptyString(q?.prompt)) errors.push(`${where}: missing prompt`);
  if (!Array.isArray(q?.options) || q.options.length !== OPTION_COUNT) {
    errors.push(`${where}: needs exactly ${OPTION_COUNT} options`);
  } else if (!q.options.every(isNonEmptyString)) {
    errors.push(`${where}: every option must be a non-empty string`);
  }
  if (!Number.isInteger(q?.correct) || q.correct < 0 || q.correct >= OPTION_COUNT) {
    errors.push(`${where}: correct must be an integer 0..${OPTION_COUNT - 1}`);
  }
  if (q?.explanation != null && typeof q.explanation !== "string") {
    errors.push(`${where}: explanation must be a string when present`);
  }
  return errors;
}

/**
 * Validates a full set and flags duplicate prompts within the same
 * (tech, difficulty) bucket — the most common authoring mistake.
 * @param {object[]} questions
 * @returns {string[]}
 */
export function validateQuestionSet(questions) {
  const errors = questions.flatMap(validateQuestion);
  const seen = new Set();
  for (const q of questions) {
    const key = `${q?.tech}|${q?.difficulty}|${(q?.prompt ?? "").trim().toLowerCase()}`;
    if (q?.tech && q?.difficulty && q?.prompt) {
      if (seen.has(key)) errors.push(`duplicate prompt in ${q.tech}/${q.difficulty}: "${q.prompt.slice(0, 50)}"`);
      seen.add(key);
    }
  }
  return errors;
}
