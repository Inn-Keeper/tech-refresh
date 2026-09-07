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
    const r = computeReadiness({
      stories: [{ competency: COMPETENCIES[0] }],
      boards: [
        { topology: 80, talkGrade: null },
        { topology: 100, talkGrade: null },
      ],
    });
    expect(r.prep).toBeNull();
    expect(r.archTopology).toBe(90);
    expect(r.archTalk).toBeNull();
    expect(r.arch).toBeNull();
    expect(r.overall).toBe(r.stories);
  });

  it("is honest about a cold start", () => {
    const r = computeReadiness({});
    expect(r).toEqual({ overall: 0, prep: null, stories: 0, arch: null, archTopology: null, archTalk: null });
  });

  it("shows topology without calling unassessed diagrams design readiness", () => {
    const boards = Array.from({ length: 5 }, () => ({ topology: 100, talkGrade: null }));
    const r = computeReadiness({ boards });
    expect(r.archTopology).toBe(100);
    expect(r.archTalk).toBeNull();
    expect(r.arch).toBeNull();
  });

  it("uses assessed reasoning grades for design readiness", () => {
    const r = computeReadiness({ boards: [{ topology: 100, talkGrade: 60 }] });
    expect(r.arch).toBe(80);
    expect(r.archTalk).toBe(60);
  });

  it("averages only graded boards while keeping topology visible for all", () => {
    const r = computeReadiness({
      boards: [
        { topology: 100, talkGrade: null },
        { topology: 40, talkGrade: 60 },
      ],
    });
    expect(r.archTopology).toBe(70);
    expect(r.archTalk).toBe(60);
    expect(r.arch).toBe(50);
  });
});
