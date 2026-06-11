import { createApi, dateToDb, dateToUi } from "../api.js";
import { CORRECT_XP } from "../gamification.js";

describe("date mapping", () => {
  it("converts ISO to DD-MM-YYYY and back", () => {
    expect(dateToUi("2026-06-11")).toBe("11-06-2026");
    expect(dateToDb("11-06-2026")).toBe("2026-06-11");
  });

  it("maps empty values to UI empty string and DB null", () => {
    expect(dateToUi(null)).toBe("");
    expect(dateToDb("")).toBeNull();
    expect(dateToDb("not-a-date")).toBeNull();
  });
});

/**
 * Minimal chainable stand-in for the Supabase client: every query resolves
 * with the table's rows, and writes are recorded for assertions.
 */
function fakeSupabase(tables = {}) {
  const calls = { inserts: [], rpcs: [] };
  const client = {
    from(table) {
      const result = { data: tables[table] ?? [], error: null };
      const query = {
        select: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null }),
        insert: (rows) => {
          calls.inserts.push({ table, rows });
          return { ...query, select: () => query, single: async () => ({ data: rows, error: null }) };
        },
        then: (resolve) => resolve(result),
      };
      return query;
    },
    rpc: async (fn, args) => {
      calls.rpcs.push({ fn, args });
      return { data: null, error: null };
    },
  };
  return { client, calls };
}

describe("createApi", () => {
  it("aggregates answer events into per-tech scores", async () => {
    const { client } = fakeSupabase({
      profiles: [{ xp: 120 }],
      answer_events: [
        { tech: "React", correct: true },
        { tech: "React", correct: true },
        { tech: "React", correct: false },
        { tech: "Docker", correct: false },
      ],
    });
    const api = createApi(client);

    const scores = await api.getScores();
    expect(scores.xp).toBe(120);
    expect(scores.answers.React).toEqual({ correct: 2, wrong: 1 });
    expect(scores.answers.Docker).toEqual({ correct: 0, wrong: 1 });
  });

  it("defaults to zero XP when no profile row exists yet", async () => {
    const { client } = fakeSupabase({ profiles: [], answer_events: [] });
    const api = createApi(client);

    const scores = await api.getScores();
    expect(scores).toEqual({ xp: 0, answers: {} });
  });

  it("records a correct answer as an event plus an XP increment", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    await api.recordAnswer("Kubernetes", true, "drill");
    expect(calls.inserts).toEqual([
      { table: "answer_events", rows: { tech: "Kubernetes", correct: true, source: "drill" } },
    ]);
    expect(calls.rpcs).toEqual([{ fn: "add_xp", args: { points: CORRECT_XP } }]);
  });

  it("records a wrong answer without awarding XP", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    await api.recordAnswer("Kubernetes", false);
    expect(calls.inserts).toHaveLength(1);
    expect(calls.rpcs).toHaveLength(0);
  });
});
