import { computeReadiness } from "../readiness.js";
import { COMPETENCIES } from "../stories.js";

describe("computeReadiness", () => {
  it("averages prep accuracy over the posting stack, counting unattempted as 0", () => {
    const r = computeReadiness({
      postingTechs: ["React", "Kubernetes"],
      answers: { React: { correct: 8, wrong: 2 } }, // 80%; Kubernetes 0%
    });
    expect(r.prep).toBe(40);
  });

  it("scores story coverage as the fraction of competencies with a story", () => {
    const stories = [
      { competency: COMPETENCIES[0] },
      { competency: COMPETENCIES[0] }, // duplicate competency counts once
      { competency: COMPETENCIES[1] },
      { competency: "Not-a-competency" },
    ];
    const r = computeReadiness({ stories });
    expect(r.stories).toBe(Math.round((2 / COMPETENCIES.length) * 100));
  });

  it("drops missing parts from the overall instead of zeroing them", () => {
    const r = computeReadiness({ stories: [{ competency: COMPETENCIES[0] }], boardScores: [80, 100] });
    expect(r.prep).toBeNull();
    expect(r.arch).toBe(90);
    expect(r.overall).toBe(Math.round((r.stories + 90) / 2));
  });

  it("is honest about a cold start", () => {
    const r = computeReadiness({});
    expect(r).toEqual({ overall: 0, prep: null, stories: 0, arch: null });
  });
});
