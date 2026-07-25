import { computeReadiness } from "../readiness.js";
import { COMPETENCIES } from "../stories.js";
import { SUBSTANTIVE_CHARS, TALK_TRACK_SECTIONS } from "../talkTrack.js";

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
        { topology: 80, talkTrack: null },
        { topology: 100, talkTrack: null },
      ],
    });
    expect(r.prep).toBeNull();
    // Topology averages 90, but neither board has reasoning attached, so the
    // design signal is half that.
    expect(r.archTopology).toBe(90);
    expect(r.archTalk).toBe(0);
    expect(r.arch).toBe(45);
    expect(r.overall).toBe(Math.round((r.stories + 45) / 2));
  });

  it("is honest about a cold start", () => {
    const r = computeReadiness({});
    expect(r).toEqual({ overall: 0, prep: null, stories: 0, arch: null, archTopology: null, archTalk: null });
  });

  it("does not call a wall of perfect diagrams readiness on its own", () => {
    const boards = Array.from({ length: 5 }, () => ({ topology: 100, talkTrack: null }));
    const r = computeReadiness({ boards });
    expect(r.archTopology).toBe(100);
    expect(r.arch).toBe(50);
  });

  it("reaches full design readiness once the reasoning is there too", () => {
    const sentence = "x".repeat(SUBSTANTIVE_CHARS);
    const talkTrack = {
      sections: Object.fromEntries(TALK_TRACK_SECTIONS.map((s) => [s.id, sentence])),
      rating: 5,
    };
    const r = computeReadiness({ boards: [{ topology: 100, talkTrack }] });
    expect(r.arch).toBe(100);
    expect(r.archTalk).toBe(100);
  });

  it("surfaces the weaker half so you know which one to work on", () => {
    const sentence = "x".repeat(SUBSTANTIVE_CHARS);
    const talkTrack = {
      sections: Object.fromEntries(TALK_TRACK_SECTIONS.map((s) => [s.id, sentence])),
      rating: 5,
    };
    const r = computeReadiness({ boards: [{ topology: 30, talkTrack }] });
    expect(r.archTopology).toBe(30);
    expect(r.archTalk).toBe(100);
  });
});
