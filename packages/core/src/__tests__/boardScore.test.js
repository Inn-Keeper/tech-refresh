import { scoreBoard } from "../boardScore.js";
describe("scoreBoard", () => {
  it("keeps an ungraded board out of the assessed score", () => {
    expect(scoreBoard({ topology: 100, talkGrade: null })).toEqual({
      topology: 100,
      talk: null,
      overall: null,
    });
  });

  it("combines topology with an assessed reasoning grade", () => {
    expect(scoreBoard({ topology: 100, talkGrade: 60 })).toEqual({
      topology: 100,
      talk: 60,
      overall: 80,
    });
  });

  it("rejects an invalid reasoning grade instead of manufacturing one", () => {
    expect(scoreBoard({ topology: 80, talkGrade: 101 }).overall).toBeNull();
    expect(scoreBoard({ topology: 80, talkGrade: -1 }).talk).toBeNull();
    expect(scoreBoard({ topology: 80, talkGrade: NaN }).talk).toBeNull();
  });

  it("clamps a nonsense topology score into range", () => {
    expect(scoreBoard({ topology: 150, talkGrade: null }).topology).toBe(100);
    expect(scoreBoard({ topology: -20, talkGrade: null }).topology).toBe(0);
    expect(scoreBoard({ topology: NaN, talkGrade: null }).topology).toBe(0);
  });
});
