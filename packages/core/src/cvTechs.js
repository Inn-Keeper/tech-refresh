// Extracts known prep techs from raw CV text. The CV is parsed in-browser
// (PDF/txt -> text) and never stored; only the matched tech list is persisted.
//
// Output is shaped like githubLanguagesToPrepTechs ({ tech, score }[]) so CV
// signals flow through the same buildGithubTechCategory path as GitHub techs.
// "score" here is occurrence count — enough to rank, no byte weighting exists.

// Tech names contain regex-special chars (C++, Next.js, Node.js) and spaces
// (Material UI), so \b boundaries don't work. We escape each name and require a
// non-alphanumeric (or string edge) on each side, which treats "+", "." and " "
// as ordinary characters inside the match while still rejecting "reactive" for
// "React".
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BOUNDARY = "(?:^|[^a-zA-Z0-9])";

/**
 * @param {string} text raw CV text
 * @param {string[]} knownTechs the prep tech vocabulary to match against
 * @param {number} [limit] max techs returned, highest count first
 * @returns {{ tech: string, score: number }[]}
 */
export function extractTechsFromText(text, knownTechs, limit = 12) {
  if (!text || !knownTechs?.length) return [];

  const counts = new Map();
  for (const tech of knownTechs) {
    const pattern = new RegExp(`${BOUNDARY}(${escapeRegExp(tech)})(?![a-zA-Z0-9])`, "gi");
    const matches = text.match(pattern);
    if (matches?.length) counts.set(tech, matches.length);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tech, score]) => ({ tech, score }));
}

/**
 * Merges GitHub tech signals ({ tech, score }[]) with CV techs (string[]) into a
 * single deduped signal list for buildGithubTechCategory. Shared by web and
 * mobile so the prep-personalization logic lives in one place. CV techs have no
 * intrinsic score, so rank by their order (earlier = stronger); when a tech
 * appears in both sources, keep the higher score.
 * @param {{ tech: string, score: number }[]} githubTechs
 * @param {string[]} cvTechs
 * @returns {{ tech: string, score: number }[]}
 */
export function mergeTechSignals(githubTechs, cvTechs) {
  const byTech = new Map();
  for (const { tech, score } of githubTechs ?? []) byTech.set(tech, score);
  const cv = cvTechs ?? [];
  cv.forEach((tech, i) => {
    byTech.set(tech, Math.max(byTech.get(tech) ?? 0, cv.length - i));
  });
  return [...byTech.entries()].map(([tech, score]) => ({ tech, score }));
}
