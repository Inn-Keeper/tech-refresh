// Back-of-envelope estimation: the round-two filter at most companies.
//
// Scenarios carry the four figures an interviewer hands you when you ask —
// users, activity, payload size, retention. Peak QPS and storage are *derived*
// from those rather than authored, so the target answer is arithmetically
// consistent with the givens by construction and can't drift from them.
//
// Grading is by order of magnitude on purpose. "About 350 a second" and "about
// 900 a second" are the same answer in an interview; "about 4 a second" is not.

const SECONDS_PER_DAY = 86_400;

/** Daily peak vs. daily average. 3x is the usual back-of-envelope hand-wave. */
export const PEAK_FACTOR = 3;

/** Back-of-envelope convention: 1 GB ≈ 10^6 KB. Nobody says 2^20 out loud. */
const KB_PER_GB = 1_000_000;

/** Within this factor either way, the answer is as good as exact. */
const CLOSE_FACTOR = 3;

/** Within this factor, the order of magnitude is right — which is the bar. */
const ORDER_FACTOR = 10;

/** A number that can take part in arithmetic, or 0. Negatives are nonsense here. */
const positive = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Request rate and write rate are tracked separately on purpose. A read-heavy
 * catalog serves orders of magnitude more traffic than it stores; folding the
 * two together would teach a storage figure that is simply wrong.
 *
 * @typedef {object} ScenarioScale
 * @property {number} dau daily active users
 * @property {number} actionsPerUserPerDay all requests per user per day
 * @property {number} writesPerUserPerDay the subset that persists something
 * @property {number} payloadKb bytes stored per write, in KB
 * @property {number} retentionDays how long the data is kept
 */

/**
 * Turns a scenario's givens into the figures a candidate is asked to produce.
 * @param {ScenarioScale} scale
 * @returns {{
 *   requestsPerDay: number,
 *   writesPerDay: number,
 *   avgQps: number,
 *   peakQps: number,
 *   storageGb: number,
 * }}
 */
export function deriveScale(scale = {}) {
  const dau = positive(scale.dau);
  const requestsPerDay = dau * positive(scale.actionsPerUserPerDay);
  const writesPerDay = dau * positive(scale.writesPerUserPerDay);
  const avgQps = requestsPerDay / SECONDS_PER_DAY;
  return {
    requestsPerDay,
    writesPerDay,
    avgQps,
    peakQps: avgQps * PEAK_FACTOR,
    storageGb: (writesPerDay * positive(scale.payloadKb) * positive(scale.retentionDays)) / KB_PER_GB,
  };
}

/** The two derived figures worth quizzing, in the order you'd say them. */
export const ESTIMATE_TARGETS = [
  {
    id: "peakQps",
    label: "Peak requests per second",
    unit: "req/s",
    hint: "Users × requests ÷ 86,400, then multiply for peak.",
    valueOf: (derived) => derived.peakQps,
  },
  {
    id: "storageGb",
    label: "Storage over the retention window",
    unit: "GB",
    hint: "Writes per day × payload × days kept.",
    valueOf: (derived) => derived.storageGb,
  },
];

/**
 * Classifies how far off a guess is, given the ratio between it and the target.
 * Symmetric: 10x over and 10x under are equally wrong.
 * @param {number} ratio
 * @returns {"close" | "order" | "off"}
 */
export function bandFor(ratio) {
  const distance = ratio >= 1 ? ratio : 1 / ratio;
  if (distance < CLOSE_FACTOR) return "close";
  if (distance <= ORDER_FACTOR) return "order";
  return "off";
}

/**
 * Grades one estimate. Returns a null band when there's nothing to grade —
 * no answer given, or a target we can't divide by — rather than inventing one.
 * @param {number} expected
 * @param {number | string | null | undefined} given
 * @returns {{ band: "close" | "order" | "off" | null, ratio: number | null, ok: boolean }}
 */
export function gradeEstimate(expected, given) {
  const target = positive(expected);
  const answer = positive(typeof given === "string" ? Number(given) : given);
  if (target === 0 || answer === 0) return { band: null, ratio: null, ok: false };

  const ratio = answer / target;
  const band = bandFor(ratio);
  return { band, ratio, ok: band !== "off" };
}

/**
 * Compact magnitude for display — how you'd say the number, not its full digits.
 * @param {number} value
 * @returns {string}
 */
export function formatCompact(value) {
  const n = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(n);
  const units = [
    { limit: 1e9, suffix: "B" },
    { limit: 1e6, suffix: "M" },
    { limit: 1e3, suffix: "K" },
  ];
  for (const { limit, suffix } of units) {
    if (abs >= limit) {
      const scaled = n / limit;
      // One decimal only when it says something: 3.7K, but 950 not 950.0.
      return `${scaled % 1 === 0 ? scaled : scaled.toFixed(1)}${suffix}`;
    }
  }
  if (abs % 1 === 0) return String(n);
  // Below 1, one decimal place would flatten real rates like 0.02 writes/day to
  // "0" — which contradicts the storage figure derived from that same number.
  if (abs < 1) return String(Number(n.toPrecision(1)));
  return String(Number(n.toFixed(1)));
}
