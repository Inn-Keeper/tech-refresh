import { buildPrepPlan } from "../prepPlan.js";
import { formatDDMMYYYY } from "../contacts.js";

describe("buildPrepPlan", () => {
  const answers = {
    React: { correct: 9, wrong: 1 }, // 90%
    Docker: { correct: 1, wrong: 3 }, // 25%
  };

  it("orders never-attempted techs first, then ascending accuracy", () => {
    const { items } = buildPrepPlan({ techs: ["React", "Kubernetes", "Docker"], answers });
    expect(items.map((i) => i.tech)).toEqual(["Kubernetes", "Docker", "React"]);
    expect(items[0].accuracy).toBeNull();
    expect(items[1]).toMatchObject({ accuracy: 25, attempts: 4 });
  });

  it("computes days left from a DD-MM-YYYY deadline", () => {
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);
    const { daysLeft } = buildPrepPlan({ techs: [], answers: {}, deadline: formatDDMMYYYY(inFiveDays) });
    expect(daysLeft).toBe(5);
  });

  it("clamps past deadlines to zero and returns null without one", () => {
    expect(buildPrepPlan({ techs: [], deadline: "01-01-2020" }).daysLeft).toBe(0);
    expect(buildPrepPlan({ techs: [] }).daysLeft).toBeNull();
  });
});
