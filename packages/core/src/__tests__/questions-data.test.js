import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateQuestionSet } from "../questions.js";
import { DIFFICULTY_KEYS } from "../difficulty.js";

// babel-jest transpiles to CJS, so __dirname is available here.
const DATA_DIR = join(__dirname, "../../data/questions");

const loadAll = () =>
  readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("._"))
    .flatMap((f) => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8")));

// Content trust gate: the question bank is hand-authored data shipped to a tool
// people interview against, so a wrong/duplicate/malformed entry must fail CI.
describe("question bank content", () => {
  const questions = loadAll();

  it("has at least one seeded question", () => {
    expect(questions.length).toBeGreaterThan(0);
  });

  it("passes structural validation with no duplicates", () => {
    const errors = validateQuestionSet(questions);
    if (errors.length) throw new Error(`Invalid question bank:\n  ${errors.join("\n  ")}`);
  });

  it("only uses known difficulty tiers", () => {
    for (const q of questions) expect(DIFFICULTY_KEYS).toContain(q.difficulty);
  });
});
