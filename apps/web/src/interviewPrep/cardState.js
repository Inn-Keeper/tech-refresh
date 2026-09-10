// What a prep card shows next. The component owns fetching the questions and
// awarding XP; everything here is a plain transition over CardState.

/** @returns {import("./types").CardState} */
export const emptyCard = () => ({
  phase: "front",
  quizIndex: 0,
  answered: null,
  runCorrect: 0,
  shuffled: null,
});

/**
 * Front -> notes. Any half-finished run is dropped.
 * @returns {import("./types").CardState}
 */
export const openBack = (state) => ({ ...state, ...emptyCard(), phase: "back" });

/**
 * Notes -> quiz, on the questions the caller just fetched or shuffled.
 * @returns {import("./types").CardState}
 */
export const openQuiz = (state, shuffled) => ({ ...state, ...emptyCard(), phase: "quiz", shuffled });

/** @returns {import("./types").CardState} */
export const flipFront = (state) => ({ ...state, phase: "front" });

/**
 * null when the answer should be ignored: no card yet, or this one is already answered.
 * @returns {{ state: import("./types").CardState, isCorrect: boolean } | null}
 */
export function answerCard(state, optionIndex) {
  if (!state || state.answered !== null || !state.shuffled) return null;
  const isCorrect = optionIndex === state.shuffled[state.quizIndex]?.correct;
  return {
    state: { ...state, answered: optionIndex, runCorrect: state.runCorrect + (isCorrect ? 1 : 0) },
    isCorrect,
  };
}

/**
 * Moves to the next question, or ends the run and returns the card to its front
 * face. `perfect` reports a clean run so the caller can award the bonus.
 * @returns {{ state: import("./types").CardState, finished: boolean, perfect: boolean } | null}
 */
export function advanceCard(state) {
  if (!state || !state.shuffled) return null;
  const nextIndex = state.quizIndex + 1;
  if (nextIndex < state.shuffled.length) {
    return { state: { ...state, quizIndex: nextIndex, answered: null }, finished: false, perfect: false };
  }
  return {
    state: { ...state, ...emptyCard() },
    finished: true,
    perfect: state.runCorrect === state.shuffled.length,
  };
}
