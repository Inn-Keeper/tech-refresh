import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "prep-scores";
const EMPTY = { xp: 0, answers: {} };

export const CORRECT_XP = 10;
export const PERFECT_QUIZ_BONUS = 30;

// Quiz score store. Persists via the dev-server file API (src/scores.json);
// falls back to localStorage when the API isn't available (static builds).
export function useScores() {
  const [scores, setScores] = useState(EMPTY);
  const apiOk = useRef(false);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        apiOk.current = true;
        setScores({ ...EMPTY, ...data });
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) setScores({ ...EMPTY, ...JSON.parse(raw) });
        } catch {
          // corrupted local data — start fresh
        }
      });
  }, []);

  const persist = (next) => {
    setScores(next);
    if (apiOk.current) {
      fetch("/api/scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => {});
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full or unavailable — scores stay in memory for the session
      }
    }
  };

  const record = (tech, isCorrect) => {
    const prev = scores.answers[tech] || { correct: 0, wrong: 0 };
    persist({
      xp: scores.xp + (isCorrect ? CORRECT_XP : 0),
      answers: {
        ...scores.answers,
        [tech]: {
          correct: prev.correct + (isCorrect ? 1 : 0),
          wrong: prev.wrong + (isCorrect ? 0 : 1),
        },
      },
    });
  };

  const addXp = (points) => persist({ ...scores, xp: scores.xp + points });

  return { scores, record, addXp };
}
