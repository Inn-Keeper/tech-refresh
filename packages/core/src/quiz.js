// Quiz mechanics shared by web and mobile.

export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export function shuffleOptions(question) {
  const indexed = question.options.map((opt, i) => ({ opt, isCorrect: i === question.correct }));
  const shuffled = shuffle(indexed);
  return {
    ...question,
    options: shuffled.map((x) => x.opt),
    correct: shuffled.findIndex((x) => x.isCorrect),
  };
}

// Builds a drill session from the user's weakest techs (lowest accuracy first,
// padded with never-attempted techs when there isn't enough data).
export function buildDrill(categories, answers, { techCount = 5, size = 10 } = {}) {
  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, color: c.color }))
  );
  const attempted = Object.entries(answers)
    .map(([tech, s]) => {
      const total = s.correct + s.wrong;
      return { tech, acc: total > 0 ? s.correct / total : 0 };
    })
    .sort((a, b) => a.acc - b.acc)
    .map((s) => s.tech);
  const unattempted = shuffle(allItems.map((i) => i.tech).filter((t) => !answers[t]));
  const targetTechs = [...attempted, ...unattempted].slice(0, techCount);
  const pool = allItems
    .filter((i) => targetTechs.includes(i.tech))
    .flatMap((i) => i.quiz.map((q) => ({ tech: i.tech, color: i.color, q: shuffleOptions(q) })));
  return shuffle(pool).slice(0, size);
}
