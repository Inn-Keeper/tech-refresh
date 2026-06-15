const QUIZ_SIZE_KEY = "grip.quizSize";

/** Returns the stored quiz size, or null meaning "use all available". */
export function getQuizSize() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(QUIZ_SIZE_KEY);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 3 ? n : null;
}

export function setQuizSize(value: number | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    window.localStorage.removeItem(QUIZ_SIZE_KEY);
  } else {
    window.localStorage.setItem(QUIZ_SIZE_KEY, String(value));
  }
}
