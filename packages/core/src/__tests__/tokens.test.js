import { colors, tints } from "../tokens.js";

// UI code derives tints via `${colors.x}NN` string concat — a non-6-digit
// color silently produces an invalid tint, so the format is load-bearing.
describe("tokens", () => {
  it("keeps every color a 6-digit hex (alpha-concat invariant)", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect({ name, value }).toEqual({ name, value: expect.stringMatching(/^#[0-9A-F]{6}$/i) });
    }
  });

  it("keeps every pre-baked tint an 8-digit hex", () => {
    for (const [name, value] of Object.entries(tints)) {
      expect({ name, value }).toEqual({ name, value: expect.stringMatching(/^#[0-9A-F]{8}$/i) });
    }
  });
});
