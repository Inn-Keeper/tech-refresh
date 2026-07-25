import {
  TALK_TRACK_SECTIONS,
  SELF_RATING_MAX,
  SUBSTANTIVE_CHARS,
  emptyTalkTrack,
  normalizeTalkTrack,
  scoreTalkTrack,
  hasTalkTrackContent,
} from "../talkTrack.js";

const sentence = "x".repeat(SUBSTANTIVE_CHARS);
const full = () => Object.fromEntries(TALK_TRACK_SECTIONS.map((s) => [s.id, sentence]));

describe("TALK_TRACK_SECTIONS", () => {
  it("covers the six graded beats with unique ids, labels, and hints", () => {
    expect(TALK_TRACK_SECTIONS).toHaveLength(6);
    expect(new Set(TALK_TRACK_SECTIONS.map((s) => s.id)).size).toBe(6);
    for (const section of TALK_TRACK_SECTIONS) {
      expect(section.label.trim()).not.toBe("");
      expect(section.hint.trim()).not.toBe("");
    }
  });
});

describe("emptyTalkTrack", () => {
  it("returns every section as an empty string", () => {
    const track = emptyTalkTrack();
    expect(Object.keys(track).sort()).toEqual(TALK_TRACK_SECTIONS.map((s) => s.id).sort());
    expect(Object.values(track).every((v) => v === "")).toBe(true);
  });
});

describe("normalizeTalkTrack", () => {
  it("fills in sections missing from a board saved before they existed", () => {
    const { sections } = normalizeTalkTrack({ sections: { requirements: "kept" } });
    expect(sections.requirements).toBe("kept");
    expect(sections.tradeoff).toBe("");
  });

  it("drops unknown keys and non-string values", () => {
    const { sections } = normalizeTalkTrack({ sections: { bogus: "nope", api: 42 } });
    expect(sections.bogus).toBeUndefined();
    expect(sections.api).toBe("");
  });

  it("rejects out-of-range and non-numeric ratings", () => {
    expect(normalizeTalkTrack({ rating: 0 }).rating).toBeNull();
    expect(normalizeTalkTrack({ rating: SELF_RATING_MAX + 1 }).rating).toBeNull();
    expect(normalizeTalkTrack({ rating: "good" }).rating).toBeNull();
    expect(normalizeTalkTrack({ rating: 3 }).rating).toBe(3);
  });

  it("survives null, undefined, and non-object input", () => {
    for (const input of [null, undefined, "nope", 7]) {
      const { sections, rating } = normalizeTalkTrack(input);
      expect(rating).toBeNull();
      expect(Object.values(sections).every((v) => v === "")).toBe(true);
    }
  });
});

describe("scoreTalkTrack", () => {
  it("scores an empty track at 0% with every section missing", () => {
    const result = scoreTalkTrack(null);
    expect(result.completion).toBe(0);
    expect(result.score).toBe(0);
    expect(result.missing).toHaveLength(6);
  });

  it("counts a section only once it reaches a full sentence", () => {
    const stub = scoreTalkTrack({ sections: { requirements: "cache + db" } });
    expect(stub.completion).toBe(0);
    expect(stub.answered).toEqual([]);

    const real = scoreTalkTrack({ sections: { requirements: sentence } });
    expect(real.answered).toEqual(["requirements"]);
    expect(real.completion).toBe(17);
  });

  it("ignores whitespace padding when measuring a section", () => {
    const padded = scoreTalkTrack({ sections: { api: `   ${"y".repeat(5)}   ` } });
    expect(padded.answered).toEqual([]);
  });

  it("scores a complete, unrated track on completion alone", () => {
    const result = scoreTalkTrack({ sections: full() });
    expect(result.completion).toBe(100);
    expect(result.rating).toBeNull();
    expect(result.score).toBe(100);
  });

  it("averages completion with the self-rating when one is given", () => {
    // Full coverage (100) rated 3/5 (60) averages to 80.
    const result = scoreTalkTrack({ sections: full(), rating: 3 });
    expect(result.score).toBe(80);
  });

  it("does not let a high self-rating hide skipped sections", () => {
    const half = { requirements: sentence, scale: sentence, api: sentence };
    const result = scoreTalkTrack({ sections: half, rating: SELF_RATING_MAX });
    expect(result.completion).toBe(50);
    expect(result.score).toBe(75);
    expect(result.missing).toEqual(["dataModel", "bottleneck", "tradeoff"]);
  });
});

describe("hasTalkTrackContent", () => {
  it("is false for a blank track and true once anything is entered", () => {
    expect(hasTalkTrackContent(null)).toBe(false);
    expect(hasTalkTrackContent({ sections: emptyTalkTrack() })).toBe(false);
    expect(hasTalkTrackContent({ sections: { api: "x" } })).toBe(true);
    expect(hasTalkTrackContent({ rating: 2 })).toBe(true);
  });
});
