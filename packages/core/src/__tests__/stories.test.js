import { COMPETENCIES, groupStoriesByCompetency } from "../stories.js";

const makeStory = (competency, title) => ({ id: `id-${title}`, title, competency });

describe("groupStoriesByCompetency", () => {
  it("returns one entry per competency", () => {
    const result = groupStoriesByCompetency([]);
    expect(result).toHaveLength(COMPETENCIES.length);
  });

  it("populates covered competencies with matching stories", () => {
    const stories = [
      makeStory("Impact", "Shipped the redesign"),
      makeStory("Impact", "Cut load time by 40%"),
      makeStory("Leadership", "Led without authority"),
    ];
    const result = groupStoriesByCompetency(stories);
    const impact = result.find((g) => g.competency === "Impact");
    const leadership = result.find((g) => g.competency === "Leadership");

    expect(impact.stories).toHaveLength(2);
    expect(impact.stories.map((s) => s.title)).toContain("Shipped the redesign");
    expect(leadership.stories).toHaveLength(1);
  });

  it("sorts covered competencies before empty ones", () => {
    const stories = [makeStory("Delivery", "Shipped on time")];
    const result = groupStoriesByCompetency(stories);
    expect(result[0].stories.length).toBeGreaterThan(0);
    const firstEmptyIndex = result.findIndex((g) => g.stories.length === 0);
    const lastCoveredIndex = result.map((g) => g.stories.length > 0).lastIndexOf(true);
    expect(lastCoveredIndex).toBeLessThan(firstEmptyIndex);
  });

  it("sorts covered competencies by story count descending", () => {
    const stories = [
      makeStory("Impact", "A"),
      makeStory("Impact", "B"),
      makeStory("Impact", "C"),
      makeStory("Failure", "X"),
    ];
    const result = groupStoriesByCompetency(stories);
    const covered = result.filter((g) => g.stories.length > 0);
    expect(covered[0].competency).toBe("Impact");
    expect(covered[1].competency).toBe("Failure");
  });

  it("attaches the correct color to each group", () => {
    const result = groupStoriesByCompetency([]);
    for (const group of result) {
      expect(group.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("ignores stories with unknown competencies", () => {
    const stories = [makeStory("Unknown", "Ghost story")];
    const result = groupStoriesByCompetency(stories);
    const total = result.reduce((sum, g) => sum + g.stories.length, 0);
    expect(total).toBe(0);
  });
});
