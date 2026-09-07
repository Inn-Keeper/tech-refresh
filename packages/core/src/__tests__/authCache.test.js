import { identityChanged } from "../authCache.js";

describe("identityChanged", () => {
  it("preserves a restored cache when the initial session resolves", () => {
    expect(identityChanged(undefined, "user-a")).toBe(false);
  });

  it("preserves a cache when the same user's token refreshes", () => {
    expect(identityChanged("user-a", "user-a")).toBe(false);
  });

  it("clears private data on sign-out", () => {
    expect(identityChanged("user-a", null)).toBe(true);
  });

  it("clears private data before another user renders", () => {
    expect(identityChanged("user-a", "user-b")).toBe(true);
  });
});
