// Quiz mechanics shared by web and mobile.

// Fisher-Yates: a uniform shuffle. (A `sort(() => Math.random() - 0.5)`
// comparator is non-uniform and engine-dependent, which would bias where the
// correct answer lands across many questions.)
export const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export function shuffleOptions(question) {
  const indexed = question.options.map((opt, i) => ({ opt, isCorrect: i === question.correct }));
  const shuffled = shuffle(indexed);
  return {
    ...question,
    options: shuffled.map((x) => x.opt),
    correct: shuffled.findIndex((x) => x.isCorrect),
  };
}

// Picks the techs a drill should focus on: weakest attempted first (lowest
// accuracy), padded with never-attempted techs when there isn't enough data.
// Pure and synchronous — shared by the static flip-card drill and the
// difficulty-tiered DB drill, which differ only in where they source questions.
export function selectDrillTechs(categories, answers, { techCount = 5 } = {}) {
  const allTechs = categories.flatMap((c) => c.items.map((item) => item.tech));
  const attempted = Object.entries(answers)
    .map(([tech, s]) => {
      const total = s.correct + s.wrong;
      return { tech, acc: total > 0 ? s.correct / total : 0 };
    })
    .sort((a, b) => a.acc - b.acc)
    .map((s) => s.tech);
  const unattempted = shuffle(allTechs.filter((t) => !answers[t]));
  return [...attempted, ...unattempted].slice(0, techCount);
}

// Builds a static drill session from the per-tech flip-card quizzes.
export function buildDrill(categories, answers, { techCount = 5, size = 10 } = {}) {
  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, color: c.color }))
  );
  const targetTechs = selectDrillTechs(categories, answers, { techCount });
  const pool = allItems
    .filter((i) => targetTechs.includes(i.tech))
    .flatMap((i) => i.quiz.map((q) => ({ tech: i.tech, color: i.color, q: shuffleOptions(q) })));
  return shuffle(pool).slice(0, size);
}

// Builds a tiered drill from questions already fetched from the DB. Maps each
// row to the drill-entry shape (tech, color, shuffled question) the UI expects.
// `colorByTech` resolves a tech's category color; falls back to `fallbackColor`.
/**
 * @param {{ tech: string, prompt: string, options: string[], correct: number }[]} questions
 * @param {{ colorByTech?: Record<string, string>, fallbackColor?: string, size?: number }} [opts]
 */
export function buildDrillFromQuestions(questions, { colorByTech = {}, fallbackColor, size = 10 } = {}) {
  const pool = questions.map((row) => ({
    tech: row.tech,
    color: colorByTech[row.tech] ?? fallbackColor,
    q: shuffleOptions({ question: row.prompt, options: row.options, correct: row.correct }),
  }));
  return shuffle(pool).slice(0, size);
}
