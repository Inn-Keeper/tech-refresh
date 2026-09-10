// Drill run transitions, shared by the standalone drill and the mock loop's
// quiz round. Scoring rules live here; XP and celebrations stay in the caller.

/**
 * null when the answer should be ignored: no drill, already answered, or the
 * index has run past the questions. Reports the tech so the caller can record it.
 */
export function answerDrill(drill, optionIndex) {
  if (!drill || drill.answered !== null) return null;
  const current = drill.questions[drill.index];
  if (!current) return null;
  const isCorrect = optionIndex === current.q.correct;
  return {
    drill: { ...drill, answered: optionIndex, correctCount: drill.correctCount + (isCorrect ? 1 : 0) },
    isCorrect,
    tech: current.tech,
  };
}

/**
 * Moves to the next question, or marks the run done. `perfect` reports a clean
 * run so the caller can award the bonus and celebrate.
 */
export function advanceDrill(drill) {
  if (!drill) return null;
  const nextIndex = drill.index + 1;
  if (nextIndex < drill.questions.length) {
    return { drill: { ...drill, index: nextIndex, answered: null }, finished: false, perfect: false };
  }
  return {
    drill: { ...drill, done: true },
    finished: true,
    perfect: drill.correctCount === drill.questions.length,
  };
}
