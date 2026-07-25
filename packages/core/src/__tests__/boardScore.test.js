import { scoreBoard } from "../boardScore.js";
import { SUBSTANTIVE_CHARS, TALK_TRACK_SECTIONS } from "../talkTrack.js";

const sentence = "x".repeat(SUBSTANTIVE_CHARS);
const fullTrack = {
  sections: Object.fromEntries(TALK_TRACK_SECTIONS.map((s) => [s.id, sentence])),
  rating: 5,
};

describe("scoreBoard", () => {
  it("caps a perfect diagram with no reasoning at half", () => {
    // The whole point: boxes are half the round. Drawing them all and saying
    // nothing is not a 100.
    const result = scoreBoard({ topology: 100, talkTrack: null });
    expect(result.topology).toBe(100);
    expect(result.talk).toBe(0);
    expect(result.overall).toBe(50);
  });

  it("scores a complete round at full marks", () => {
    expect(scoreBoard({ topology: 100, talkTrack: fullTrack }).overall).toBe(100);
  });

  it("reports the two halves separately so a gap is legible", () => {
    const result = scoreBoard({ topology: 40, talkTrack: fullTrack });
    expect(result.topology).toBe(40);
    expect(result.talk).toBe(100);
    expect(result.overall).toBe(70);
  });

  it("does not let reasoning alone carry a board with no design", () => {
    expect(scoreBoard({ topology: 0, talkTrack: fullTrack }).overall).toBe(50);
  });

  it("clamps a nonsense topology score into range", () => {
    expect(scoreBoard({ topology: 150, talkTrack: null }).topology).toBe(100);
    expect(scoreBoard({ topology: -20, talkTrack: null }).topology).toBe(0);
    expect(scoreBoard({ topology: NaN, talkTrack: null }).topology).toBe(0);
  });
});
