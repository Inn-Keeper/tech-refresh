import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceCard, answerCard, emptyCard, flipFront, openBack, openQuiz } from "./cardState.js";

const questions = [
  { question: "one", options: ["a", "b"], correct: 0 },
  { question: "two", options: ["a", "b"], correct: 1 },
];

const quizAt = (index, runCorrect) => ({ ...emptyCard(), phase: "quiz", quizIndex: index, runCorrect, shuffled: questions });

test("opening the quiz clears a previous run", () => {
  const stale = { ...emptyCard(), phase: "back", quizIndex: 1, answered: 0, runCorrect: 1 };
  assert.deepEqual(openQuiz(stale, questions), { ...emptyCard(), phase: "quiz", shuffled: questions });
});

test("flipping to the notes drops any half-finished run", () => {
  const mid = quizAt(1, 1);
  assert.deepEqual(openBack(mid), { ...emptyCard(), phase: "back" });
});

test("flipping to the front keeps the run intact", () => {
  const mid = quizAt(1, 1);
  assert.deepEqual(flipFront(mid), { ...mid, phase: "front" });
});

test("a correct answer counts once and locks the question", () => {
  const first = answerCard(quizAt(0, 0), 0);
  assert.equal(first.isCorrect, true);
  assert.equal(first.state.runCorrect, 1);
  assert.equal(answerCard(first.state, 1), null);
});

test("a wrong answer locks the question without counting", () => {
  const result = answerCard(quizAt(0, 0), 1);
  assert.equal(result.isCorrect, false);
  assert.equal(result.state.runCorrect, 0);
});

test("advancing mid-run clears the answer and keeps the tally", () => {
  const next = advanceCard({ ...quizAt(0, 1), answered: 0 });
  assert.deepEqual(next, { state: { ...quizAt(1, 1), answered: null }, finished: false, perfect: false });
});

test("the last question ends the run and resets the card", () => {
  const next = advanceCard({ ...quizAt(1, 2), answered: 1 });
  assert.equal(next.finished, true);
  assert.equal(next.perfect, true);
  assert.deepEqual(next.state, emptyCard());
});

test("a run with a miss is not perfect", () => {
  assert.equal(advanceCard(quizAt(1, 1)).perfect, false);
});

test("transitions ignore a card with no questions loaded", () => {
  assert.equal(answerCard(undefined, 0), null);
  assert.equal(advanceCard(emptyCard()), null);
});
