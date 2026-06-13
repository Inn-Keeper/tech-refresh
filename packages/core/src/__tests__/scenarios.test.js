import { SCENARIOS, SCENARIO_CATEGORIES, NODE_TYPES, buildCustomChecks, evaluate } from "../arch.js";

// The scenario library is hand-authored data; these invariants are what the
// evaluator and the scenario pickers in both apps rely on.
const VALID_TYPES = new Set(NODE_TYPES.map((t) => t.type));

describe("scenario library", () => {
  it("ships exactly 100 scenarios with unique ids", () => {
    expect(SCENARIOS).toHaveLength(100);
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(100);
  });

  it("assigns every scenario to a known category", () => {
    for (const s of SCENARIOS) {
      expect(SCENARIO_CATEGORIES).toContain(s.category);
    }
  });

  it("gives every scenario a name, brief, and sane budget", () => {
    for (const s of SCENARIOS) {
      expect(s.name.trim()).not.toBe("");
      expect(s.brief.trim()).not.toBe("");
      expect(Number.isInteger(s.budget)).toBe(true);
      expect(s.budget).toBeGreaterThanOrEqual(6);
      expect(s.budget).toBeLessThanOrEqual(25);
    }
  });

  it("only references palette node types in checks", () => {
    for (const s of SCENARIOS) {
      expect(s.checks.length).toBeGreaterThanOrEqual(6);
      for (const c of s.checks) {
        const referenced = c.kind === "node" ? c.type : [...c.from, ...c.to];
        expect(referenced.length).toBeGreaterThan(0);
        for (const type of referenced) {
          if (!VALID_TYPES.has(type)) {
            throw new Error(`Scenario "${s.id}" check "${c.label}" references unknown type "${type}"`);
          }
        }
        expect(c.points).toBeGreaterThan(0);
        expect(c.label.trim()).not.toBe("");
      }
    }
  });

  it("keeps warning rules callable", () => {
    const helpers = { hasNode: () => true, hasEdge: () => true };
    for (const s of SCENARIOS) {
      for (const w of s.warnings ?? []) {
        expect(typeof w.when({ ...helpers })).toBe("boolean");
        expect(w.text.trim()).not.toBe("");
      }
    }
  });
});

describe("buildCustomChecks", () => {
  it("compiles node and edge requirements with palette labels", () => {
    const checks = buildCustomChecks(["client", "cache"], [{ from: "service", to: "cache" }]);
    expect(checks).toEqual([
      { kind: "node", type: ["client"], label: "Client is part of the design", points: 33 },
      { kind: "node", type: ["cache"], label: "Cache (Redis) is part of the design", points: 33 },
      { kind: "edge", from: ["service"], to: ["cache"], label: "Service / API connects to Cache (Redis)", points: 33 },
    ]);
  });

  it("produces checks the evaluator can score", () => {
    const scenario = {
      id: "custom-test",
      name: "Custom",
      brief: "",
      budget: 10,
      checks: buildCustomChecks(["client"], [{ from: "client", to: "service" }]),
    };
    const nodes = [
      { id: "a", type: "client", x: 0, y: 0 },
      { id: "b", type: "service", x: 0, y: 0 },
    ];
    const edges = [{ id: "e1", from: "a", to: "b" }];
    const result = evaluate(scenario, nodes, edges);
    expect(result.score).toBe(100);
  });
});
