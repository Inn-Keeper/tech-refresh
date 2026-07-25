import {
  ESTIMATE_TARGETS,
  PEAK_FACTOR,
  bandFor,
  deriveScale,
  formatCompact,
  gradeEstimate,
} from "../estimation.js";

// 1M users × 10 requests/day, of which 10 are writes at 1 KB, kept a year.
const scale = {
  dau: 1_000_000,
  actionsPerUserPerDay: 10,
  writesPerUserPerDay: 10,
  payloadKb: 1,
  retentionDays: 365,
};

describe("deriveScale", () => {
  it("derives writes per day from users and per-user write activity", () => {
    expect(deriveScale(scale).writesPerDay).toBe(10_000_000);
  });

  it("drives QPS from total requests, not just the writes", () => {
    const readHeavy = deriveScale({ ...scale, actionsPerUserPerDay: 100 });
    expect(readHeavy.requestsPerDay).toBe(100_000_000);
    expect(Math.round(readHeavy.peakQps)).toBe(3472);
  });

  it("does not let read traffic inflate stored bytes", () => {
    // A read-heavy catalog serves 100x the traffic it stores.
    const readHeavy = deriveScale({ ...scale, actionsPerUserPerDay: 1000, writesPerUserPerDay: 0.01 });
    expect(Math.round(readHeavy.storageGb)).toBe(4);
  });

  it("spreads requests over a day for average QPS", () => {
    expect(Math.round(deriveScale(scale).avgQps)).toBe(116);
  });

  it("applies the peak multiplier on top of average QPS", () => {
    const { avgQps, peakQps } = deriveScale(scale);
    expect(peakQps).toBeCloseTo(avgQps * PEAK_FACTOR, 5);
  });

  it("sizes storage over the retention window, not forever", () => {
    // 10M writes/day × 1 KB × 365 days = 3.65e9 KB = 3650 GB.
    expect(Math.round(deriveScale(scale).storageGb)).toBe(3650);
    const shortLived = deriveScale({ ...scale, retentionDays: 30 });
    expect(Math.round(shortLived.storageGb)).toBe(300);
  });

  it("treats missing or nonsense inputs as zero rather than NaN", () => {
    const derived = deriveScale({
      dau: NaN,
      actionsPerUserPerDay: -5,
      writesPerUserPerDay: -5,
      payloadKb: undefined,
      retentionDays: 0,
    });
    expect(derived.writesPerDay).toBe(0);
    expect(derived.peakQps).toBe(0);
    expect(derived.storageGb).toBe(0);
  });
});

describe("bandFor", () => {
  it("calls a guess within 3x close", () => {
    expect(bandFor(1)).toBe("close");
    expect(bandFor(2.9)).toBe("close");
    expect(bandFor(1 / 2.9)).toBe("close");
  });

  it("calls a guess within 10x the right order of magnitude", () => {
    expect(bandFor(5)).toBe("order");
    expect(bandFor(1 / 9)).toBe("order");
  });

  it("calls anything beyond 10x off", () => {
    expect(bandFor(11)).toBe("off");
    expect(bandFor(1 / 50)).toBe("off");
  });
});

describe("gradeEstimate", () => {
  it("grades an exact answer as close with ratio 1", () => {
    const result = gradeEstimate(350, 350);
    expect(result.band).toBe("close");
    expect(result.ratio).toBe(1);
    expect(result.ok).toBe(true);
  });

  it("is symmetric — 10x over and 10x under grade the same", () => {
    expect(gradeEstimate(100, 1000).band).toBe(gradeEstimate(100, 10).band);
  });

  it("accepts an order-of-magnitude answer as passing", () => {
    // The bar is magnitude, not precision. 900 vs 350 is 2.6x — still "close";
    // 2000 vs 350 is 5.7x, the right order of magnitude and a pass.
    expect(gradeEstimate(350, 900).band).toBe("close");
    expect(gradeEstimate(350, 2000).band).toBe("order");
    expect(gradeEstimate(350, 2000).ok).toBe(true);
  });

  it("fails a guess that is orders of magnitude out", () => {
    const result = gradeEstimate(350, 4);
    expect(result.band).toBe("off");
    expect(result.ok).toBe(false);
  });

  it("returns no grade until an answer is actually given", () => {
    for (const given of [null, undefined, "", NaN]) {
      expect(gradeEstimate(350, given).band).toBeNull();
    }
  });

  it("refuses to grade against a target of zero instead of dividing by it", () => {
    expect(gradeEstimate(0, 10).band).toBeNull();
  });
});

describe("ESTIMATE_TARGETS", () => {
  it("asks for the two figures an interviewer makes you derive", () => {
    expect(ESTIMATE_TARGETS.map((target) => target.id)).toEqual(["peakQps", "storageGb"]);
    expect(ESTIMATE_TARGETS[0].label).toMatch(/request/i);
    for (const target of ESTIMATE_TARGETS) {
      expect(target.label.trim()).not.toBe("");
      expect(target.unit.trim()).not.toBe("");
      expect(typeof target.valueOf(deriveScale(scale))).toBe("number");
    }
  });
});

describe("formatCompact", () => {
  it("renders magnitudes the way you would say them out loud", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(3_400)).toBe("3.4K");
    expect(formatCompact(5_000)).toBe("5K");
    expect(formatCompact(1_200_000)).toBe("1.2M");
    expect(formatCompact(2_500_000_000)).toBe("2.5B");
  });

  it("keeps small and fractional values readable", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(3.4)).toBe("3.4");
  });

  it("never rounds a real fraction down to a flat zero", () => {
    // A catalog writing 0.02 times per user per day still writes. Showing "0"
    // would contradict the storage figure derived from that same number.
    expect(formatCompact(0.02)).toBe("0.02");
    expect(formatCompact(0.5)).toBe("0.5");
    expect(formatCompact(0.001)).toBe("0.001");
  });
});
