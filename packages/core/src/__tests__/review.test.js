import { buildReviewQueue, reviewIntervalDays, REVIEW_INTERVALS_DAYS } from "../review.js";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-07-10T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY_MS).toISOString();

describe("reviewIntervalDays", () => {
  it("doubles with the streak and caps at the last interval", () => {
    expect(reviewIntervalDays(0)).toBe(1);
    expect(reviewIntervalDays(1)).toBe(2);
    expect(reviewIntervalDays(2)).toBe(4);
    expect(reviewIntervalDays(99)).toBe(REVIEW_INTERVALS_DAYS.at(-1));
  });
});

describe("buildReviewQueue", () => {
  it("marks a tech due once its streak interval has passed", () => {
    // One correct answer 3 days ago: streak 1 -> 2-day interval -> due.
    const queue = buildReviewQueue([{ tech: "React", correct: true, created_at: daysAgo(3) }], NOW);
    expect(queue).toEqual([
      expect.objectContaining({ tech: "React", streak: 1, intervalDays: 2, due: true }),
    ]);
  });

  it("keeps a freshly answered tech out of the due set", () => {
    const queue = buildReviewQueue([{ tech: "React", correct: true, created_at: daysAgo(0) }], NOW);
    expect(queue[0].due).toBe(false);
  });

  it("resets the streak on a wrong answer so the tech comes back in a day", () => {
    const events = [
      { tech: "Docker", correct: true, created_at: daysAgo(10) },
      { tech: "Docker", correct: true, created_at: daysAgo(9) },
      { tech: "Docker", correct: false, created_at: daysAgo(2) },
    ];
    const queue = buildReviewQueue(events, NOW);
    expect(queue[0]).toMatchObject({ tech: "Docker", streak: 0, intervalDays: 1, due: true });
  });

  it("counts only the streak ending at the latest answer", () => {
    const events = [
      { tech: "Go", correct: false, created_at: daysAgo(6) },
      { tech: "Go", correct: true, created_at: daysAgo(5) },
      { tech: "Go", correct: true, created_at: daysAgo(4) },
    ];
    // Streak 2 -> 4-day interval, answered 4 days ago -> exactly due.
    expect(buildReviewQueue(events, NOW)[0]).toMatchObject({ streak: 2, intervalDays: 4, due: true });
  });

  it("orders most-overdue first and ignores unattempted or unparseable events", () => {
    const events = [
      { tech: "React", correct: true, created_at: daysAgo(30) },
      { tech: "Vue", correct: true, created_at: daysAgo(3) },
      { tech: "Broken", correct: true, created_at: "not-a-date" },
    ];
    const queue = buildReviewQueue(events, NOW);
    expect(queue.map((q) => q.tech)).toEqual(["React", "Vue"]);
  });

  it("returns an empty queue for no events", () => {
    expect(buildReviewQueue([], NOW)).toEqual([]);
  });
});
