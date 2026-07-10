import { composeMockLoop, scoreMockLoop, STORY_RATING_MAX } from "../mockLoop.js";

describe("composeMockLoop", () => {
  it("picks one scenario and one prompt deterministically for a fixed rng", () => {
    const scenarios = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const prompts = [{ text: "p1" }, { text: "p2" }];
    const { scenario, prompt } = composeMockLoop({ scenarios, prompts, rng: () => 0.99 });
    expect(scenario.id).toBe("c");
    expect(prompt.text).toBe("p2");
  });
});

describe("scoreMockLoop", () => {
  it("averages quiz, design, and story rounds on a 0-100 scale", () => {
    const s = scoreMockLoop({ quizCorrect: 8, quizTotal: 10, archScore: 60, storyRating: STORY_RATING_MAX });
    expect(s).toEqual({ overall: 80, quiz: 80, arch: 60, story: 100 });
  });

  it("drops skipped rounds from the average instead of scoring them zero", () => {
    const s = scoreMockLoop({ quizCorrect: 5, quizTotal: 10 });
    expect(s).toEqual({ overall: 50, quiz: 50, arch: null, story: null });
  });

  it("clamps out-of-range arch scores and handles a fully skipped loop", () => {
    expect(scoreMockLoop({ quizTotal: 0, archScore: 250 }).arch).toBe(100);
    expect(scoreMockLoop({}).overall).toBeNull();
  });
});
