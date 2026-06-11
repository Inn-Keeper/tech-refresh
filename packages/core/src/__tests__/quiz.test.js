import { buildDrill, shuffleOptions } from "../quiz.js";

const question = {
  question: "Which one is right?",
  options: ["wrong A", "right", "wrong B", "wrong C"],
  correct: 1,
};

describe("shuffleOptions", () => {
  it("keeps the correct index pointing at the correct answer after shuffling", () => {
    for (let run = 0; run < 50; run++) {
      const shuffled = shuffleOptions(question);
      expect(shuffled.options[shuffled.correct]).toBe("right");
    }
  });

  it("preserves the full option set", () => {
    const shuffled = shuffleOptions(question);
    expect([...shuffled.options].sort()).toEqual([...question.options].sort());
  });

  it("does not mutate the source question", () => {
    shuffleOptions(question);
    expect(question.correct).toBe(1);
    expect(question.options[1]).toBe("right");
  });
});

describe("buildDrill", () => {
  const makeQuiz = (tech) =>
    [1, 2, 3].map((n) => ({
      question: `${tech} q${n}`,
      options: ["a", "b", "c", "d"],
      correct: 0,
    }));

  const categories = [
    {
      color: "#111111",
      items: ["t1", "t2", "t3"].map((tech) => ({ tech, quiz: makeQuiz(tech) })),
    },
    {
      color: "#222222",
      items: ["t4", "t5", "t6"].map((tech) => ({ tech, quiz: makeQuiz(tech) })),
    },
  ];

  it("caps the session at the requested size", () => {
    const drill = buildDrill(categories, {}, { techCount: 5, size: 10 });
    expect(drill).toHaveLength(10);
  });

  it("always includes the weakest attempted tech", () => {
    const answers = {
      t1: { correct: 0, wrong: 3 }, // 0% — weakest
      t2: { correct: 3, wrong: 0 }, // 100%
    };
    const drill = buildDrill(categories, answers, { techCount: 2, size: 6 });
    const techs = new Set(drill.map((entry) => entry.tech));
    expect(techs.has("t1")).toBe(true);
    // techCount 2 with two attempted techs leaves no room for unattempted ones.
    expect([...techs].every((tech) => tech === "t1" || tech === "t2")).toBe(true);
  });

  it("pads with never-attempted techs when there is not enough data", () => {
    const answers = { t1: { correct: 0, wrong: 1 } };
    const drill = buildDrill(categories, answers, { techCount: 5, size: 15 });
    const techs = new Set(drill.map((entry) => entry.tech));
    expect(techs.size).toBe(5);
    expect(techs.has("t1")).toBe(true);
  });

  it("attaches the category color and a shuffled question to every entry", () => {
    const drill = buildDrill(categories, {}, { techCount: 6, size: 18 });
    for (const entry of drill) {
      expect(entry.color).toMatch(/^#/);
      expect(entry.q.options[entry.q.correct]).toBe("a");
    }
  });
});
