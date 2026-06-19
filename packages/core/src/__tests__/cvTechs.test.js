import { extractTechsFromText, mergeTechSignals } from "../cvTechs.js";

const KNOWN = ["React", "TypeScript", "Node.js", "C++", "Java", "Material UI", "Go"];

describe("extractTechsFromText", () => {
  it("matches known techs present in the text, ranked by occurrence count", () => {
    const text = "Built apps with React and TypeScript. React was the primary framework.";
    expect(extractTechsFromText(text, KNOWN)).toEqual([
      { tech: "React", score: 2 },
      { tech: "TypeScript", score: 1 },
    ]);
  });

  it("is case-insensitive", () => {
    expect(extractTechsFromText("reactjs is wrong but REACT and react count", KNOWN)).toEqual([
      { tech: "React", score: 2 },
    ]);
  });

  it("respects word boundaries — does not match substrings", () => {
    // "reactive" and "Javascript" must not match "React"/"Java".
    expect(extractTechsFromText("reactive programming in Javascript", KNOWN)).toEqual([]);
  });

  it("matches techs containing special chars and spaces", () => {
    const text = "Experience: C++, Node.js, and Material UI design systems.";
    expect(extractTechsFromText(text, KNOWN).map((t) => t.tech).sort()).toEqual([
      "C++",
      "Material UI",
      "Node.js",
    ]);
  });

  it("returns empty for missing techs, empty text, or empty vocabulary", () => {
    expect(extractTechsFromText("I write COBOL", KNOWN)).toEqual([]);
    expect(extractTechsFromText("", KNOWN)).toEqual([]);
    expect(extractTechsFromText("React everywhere", [])).toEqual([]);
  });
});

describe("mergeTechSignals", () => {
  it("ranks CV techs by order (earlier = higher score)", () => {
    expect(mergeTechSignals([], ["React", "Go", "Java"])).toEqual([
      { tech: "React", score: 3 },
      { tech: "Go", score: 2 },
      { tech: "Java", score: 1 },
    ]);
  });

  it("dedupes across sources, keeping the higher score", () => {
    // GitHub gives React a large byte-score; CV order would only give it 2.
    const merged = mergeTechSignals([{ tech: "React", score: 5000 }], ["Go", "React"]);
    expect(merged).toContainEqual({ tech: "React", score: 5000 });
    expect(merged).toContainEqual({ tech: "Go", score: 2 });
    expect(merged.filter((s) => s.tech === "React")).toHaveLength(1);
  });

  it("passes GitHub signals through untouched when there's no CV", () => {
    const github = [{ tech: "TypeScript", score: 900 }];
    expect(mergeTechSignals(github, [])).toEqual(github);
  });

  it("handles nullish inputs", () => {
    expect(mergeTechSignals(null, null)).toEqual([]);
    expect(mergeTechSignals(undefined, ["Go"])).toEqual([{ tech: "Go", score: 1 }]);
  });
});
