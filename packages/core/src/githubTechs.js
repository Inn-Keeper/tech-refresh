const LANGUAGE_TO_TECH = {
  JavaScript: "JavaScript",
  TypeScript: "TypeScript",
  Python: "Python",
  Java: "Java",
  PHP: "PHP",
  "C++": "C++",
  Swift: "Swift",
  Kotlin: "Kotlin",
  Dart: "Flutter",
  HTML: "HTML/CSS",
  CSS: "HTML/CSS",
  SCSS: "HTML/CSS",
  Shell: "Linux",
  Dockerfile: "Docker",
  HCL: "Terraform",
};

export function githubUsernameFromUrl(value) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#]+)\/?/i.exec(raw);
  if (!match) return "";
  const username = match[1].trim();
  return username && !["features", "marketplace", "pricing", "topics"].includes(username.toLowerCase()) ? username : "";
}

export function githubLanguagesToPrepTechs(languages, knownTechs, limit = 8) {
  const known = new Set(knownTechs);
  const totals = new Map();

  for (const [language, bytes] of Object.entries(languages ?? {})) {
    const tech = LANGUAGE_TO_TECH[language] ?? (known.has(language) ? language : null);
    if (!tech || !known.has(tech)) continue;
    totals.set(tech, (totals.get(tech) ?? 0) + Number(bytes || 0));
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tech, score]) => ({ tech, score }));
}

export function buildGithubTechCategory(items, techSignals, options = {}) {
  if (!techSignals?.length) return null;

  const byTech = new Map(items.map((item) => [item.tech, item]));
  const color = options.color ?? "#2DD4BF";
  const matched = techSignals
    .map((signal) => {
      const item = byTech.get(signal.tech);
      return item ? { ...item, color, githubScore: signal.score } : null;
    })
    .filter(Boolean);

  if (!matched.length) return null;

  return {
    name: "From GitHub techs",
    emoji: "⌁",
    color,
    items: matched,
    source: "github",
  };
}
