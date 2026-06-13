import { DIFFICULTIES, DIFFICULTY_KEYS, difficultyByKey } from "../difficulty.js";

describe("difficulty tiers", () => {
  it("ships the four tiers in easy → hardest order", () => {
    expect(DIFFICULTY_KEYS).toEqual(["easy", "mid", "high", "ultra"]);
  });

  it("rewards more XP as tiers get harder", () => {
    const xp = DIFFICULTIES.map((d) => d.xp);
    const ascending = [...xp].sort((a, b) => a - b);
    expect(xp).toEqual(ascending);
    expect(new Set(xp).size).toBe(xp.length); // all distinct
  });

  it("gives every tier a label, emoji, color, and blurb", () => {
    for (const d of DIFFICULTIES) {
      expect(d.label.trim()).not.toBe("");
      expect(d.emoji.trim()).not.toBe("");
      expect(d.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(d.blurb.trim()).not.toBe("");
    }
  });

  it("looks tiers up by key and returns undefined for unknown keys", () => {
    expect(difficultyByKey("ultra")).toBe(DIFFICULTIES[3]);
    expect(difficultyByKey("nope")).toBeUndefined();
    expect(difficultyByKey(null)).toBeUndefined();
  });
});
