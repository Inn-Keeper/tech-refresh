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
    expect(parseQuizSize("2")).toBe(DEFAULT_QUIZ_SIZE);
    expect(parseQuizSize("5")).toBe(5);
  });

  it("serializes null as the absence of a stored value", () => {
    expect(serializeQuizSize(null)).toBeNull();
    expect(serializeQuizSize(10)).toBe("10");
    expect(serializeQuizSize(1)).toBeNull();
  });

  it("normalizes selections against an optional pool", () => {
    expect(normalizeQuizSize(5)).toBe(5);
    expect(normalizeQuizSize(5, 5)).toBeNull();
    expect(normalizeQuizSize(10, 7)).toBeNull();
  });

  it("computes UI max and effective selected value", () => {
    expect(quizSizeMax(null)).toBe(QUIZ_SIZE_DEFAULT_MAX);
    expect(quizSizeMax(2)).toBe(QUIZ_SIZE_MIN);
    expect(effectiveQuizSize(null, 8)).toBe(8);
    expect(effectiveQuizSize(10, 8)).toBe(8);
  });

  it("turns a selected preference into a real question cap", () => {
    expect(questionCapForPool(null, 12)).toBe(12);
    expect(questionCapForPool(5, 12)).toBe(5);
    expect(questionCapForPool(20, 12)).toBe(12);
  });
});
