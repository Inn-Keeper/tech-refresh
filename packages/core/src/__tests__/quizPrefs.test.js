import {
  DEFAULT_QUIZ_SIZE,
  QUIZ_SIZE_DEFAULT_MAX,
  QUIZ_SIZE_MIN,
  effectiveQuizSize,
  normalizeQuizSize,
  parseQuizSize,
  questionCapForPool,
  quizSizeMax,
  serializeQuizSize,
} from "../quizPrefs.js";

describe("quiz preferences", () => {
  it("parses stored quiz size values", () => {
    expect(parseQuizSize(null)).toBe(DEFAULT_QUIZ_SIZE);
    expect(parseQuizSize("")).toBe(DEFAULT_QUIZ_SIZE);
    expect(parseQuizSize("0")).toBe(DEFAULT_QUIZ_SIZE);
    expect(parseQuizSize("1")).toBe(1);
    expect(parseQuizSize("5")).toBe(5);
  });

  it("serializes null as the absence of a stored value", () => {
    expect(serializeQuizSize(null)).toBeNull();
    expect(serializeQuizSize(10)).toBe("10");
    expect(serializeQuizSize(1)).toBe("1");
    expect(serializeQuizSize(0)).toBeNull();
  });

  it("normalizes selections independently from the available pool", () => {
    expect(normalizeQuizSize(5)).toBe(5);
    expect(normalizeQuizSize(1)).toBe(1);
    expect(normalizeQuizSize(5)).toBe(5);
    expect(normalizeQuizSize(10)).toBe(10);
  });

  it("computes UI max and effective selected value", () => {
    expect(quizSizeMax(null)).toBe(QUIZ_SIZE_DEFAULT_MAX);
    expect(quizSizeMax(0)).toBe(QUIZ_SIZE_MIN);
    expect(quizSizeMax(2)).toBe(2);
    expect(effectiveQuizSize(null, 8)).toBe(8);
    expect(effectiveQuizSize(10, 8)).toBe(8);
  });

  it("turns a selected preference into a real question cap", () => {
    expect(questionCapForPool(null, 12)).toBe(12);
    expect(questionCapForPool(1, 12)).toBe(1);
    expect(questionCapForPool(5, 12)).toBe(5);
    expect(questionCapForPool(20, 12)).toBe(12);
    expect(questionCapForPool(5, 5)).toBe(5);
  });
});
