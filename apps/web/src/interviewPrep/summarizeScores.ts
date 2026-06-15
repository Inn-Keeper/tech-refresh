import type { Scores, Summary } from "./types";

export function summarizeScores(scores: Scores): Summary {
  const entries = Object.entries(scores.answers);
  const totals = entries.reduce(
    (acc, [, s]) => ({ correct: acc.correct + s.correct, wrong: acc.wrong + s.wrong }),
    { correct: 0, wrong: 0 }
  );
  const attempts = totals.correct + totals.wrong;
  const accuracy = attempts ? Math.round((totals.correct / attempts) * 100) : null;
  const ranked = entries
    .filter(([, s]) => s.correct + s.wrong > 0)
    .map(([tech, s]) => ({
      tech,
      acc: Math.round((s.correct / (s.correct + s.wrong)) * 100),
      n: s.correct + s.wrong,
    }))
    .sort((a, b) => b.acc - a.acc || b.n - a.n);

  return { attempts, accuracy, ranked };
}
