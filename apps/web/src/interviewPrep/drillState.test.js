import assert from "node:assert/strict";
import { test } from "node:test";
import { advanceDrill, answerDrill } from "./drillState.js";

const drillAt = (index, correctCount) => ({
  questions: [
    { tech: "redis", color: "#f00", q: { question: "one", options: ["a", "b"], correct: 0 } },
    { tech: "kafka", color: "#0f0", q: { question: "two", options: ["a", "b"], correct: 1 } },
  ],
  index,
  answered: null,
  correctCount,
  done: false,
  difficulty: "mid",
});

test("a correct answer counts once and reports the tech", () => {
  const result = answerDrill(drillAt(0, 0), 0);
  assert.equal(result.isCorrect, true);
  assert.equal(result.tech, "redis");
  assert.equal(result.drill.correctCount, 1);
});

test("a second answer to the same question is ignored", () => {
  const answered = answerDrill(drillAt(0, 0), 0).drill;
  assert.equal(answerDrill(answered, 1), null);
});

test("a wrong answer locks the question without counting", () => {
  const result = answerDrill(drillAt(1, 1), 0);
  assert.equal(result.isCorrect, false);
  assert.equal(result.drill.correctCount, 1);
});

test("advancing mid-run clears the answer and keeps the tally", () => {
  const next = advanceDrill({ ...drillAt(0, 1), answered: 0 });
  assert.equal(next.finished, false);
  assert.equal(next.drill.index, 1);
  assert.equal(next.drill.answered, null);
  assert.equal(next.drill.correctCount, 1);
});

test("the last question ends the run and flags a clean sweep", () => {
  const next = advanceDrill({ ...drillAt(1, 2), answered: 1 });
  assert.equal(next.finished, true);
  assert.equal(next.perfect, true);
  assert.equal(next.drill.done, true);
});

test("a run with a miss is not perfect", () => {
  assert.equal(advanceDrill(drillAt(1, 1)).perfect, false);
});

test("transitions ignore a drill that is not running", () => {
  assert.equal(answerDrill(null, 0), null);
  assert.equal(advanceDrill(null), null);
});

test("an index past the last question takes no answer", () => {
  assert.equal(answerDrill(drillAt(2, 2), 0), null);
});
