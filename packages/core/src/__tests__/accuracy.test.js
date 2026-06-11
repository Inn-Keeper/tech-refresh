import { buildAccuracyTimeline } from "../accuracy.js";

describe("buildAccuracyTimeline", () => {
  it("builds cumulative daily accuracy from answer events", () => {
    const timeline = buildAccuracyTimeline([
      { correct: true, createdAt: "2026-01-02T10:00:00" },
      { correct: false, createdAt: "2026-01-01T10:00:00" },
      { correct: true, createdAt: "2026-01-01T12:00:00" },
      { correct: true, createdAt: "2026-01-03T10:00:00" },
    ]);

    expect(timeline).toEqual([
      { date: "2026-01-01", accuracy: 0.5, correct: 1, total: 2 },
      { date: "2026-01-02", accuracy: 2 / 3, correct: 2, total: 3 },
      { date: "2026-01-03", accuracy: 0.75, correct: 3, total: 4 },
    ]);
  });

  it("ignores events without timestamps", () => {
    expect(buildAccuracyTimeline([{ correct: true }])).toEqual([]);
  });
});
