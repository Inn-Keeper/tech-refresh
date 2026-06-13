import { createApi, dateToDb, dateToUi } from "../api.js";
import { CORRECT_XP } from "../gamification.js";
import { difficultyByKey } from "../difficulty.js";

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
function fakeSupabase(tables = {}, authUser = null) {
  const calls = { inserts: [], updates: [], deletes: [], rpcs: [] };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: authUser }, error: null }),
    },
    from(table) {
      const result = { data: tables[table] ?? [], error: null };
      const query = {
        select: () => query,
        order: () => query,
        eq: (column, value) => {
          query._eq = { column, value };
          return query;
        },
        in: (column, values) => {
          query._in = { column, values };
          return query;
        },
        limit: () => query,
        maybeSingle: async () => ({ data: (tables[table] ?? [])[0] ?? null, error: null }),
        single: async () => ({ data: Array.isArray(result.data) ? result.data[0] : result.data, error: null }),
        insert: (rows) => {
          calls.inserts.push({ table, rows });
          result.data = { id: "new-id", created_at: "2026-01-01", updated_at: rows.updated_at ?? "2026-01-01", ...rows };
          return query;
        },
        update: (rows) => {
          calls.updates.push({ table, rows });
          result.data = { id: query._eq?.value ?? "existing-id", created_at: "2026-01-01", updated_at: rows.updated_at ?? "2026-01-02", ...rows };
          return query;
        },
        upsert: (rows) => {
          calls.updates.push({ table, rows });
          result.data = {
            user_id: rows.user_id,
            xp: 0,
            created_at: "2026-01-01",
            updated_at: "2026-01-02",
            ...rows,
          };
          return query;
        },
        delete: () => {
          calls.deletes.push({ table });
          return query;
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

  it("merges auth identity with the app profile row", async () => {
    const { client } = fakeSupabase(
      {
        profiles: [
          {
            user_id: "user-1",
            email: "profile@example.com",
            display_name: "Profile Name",
            headline: "Frontend engineer",
            target_role: "Staff Frontend Engineer",
            location: "Stockholm",
            github_url: "https://github.com/profile",
            xp: 120,
            onboarding_completed: true,
            created_at: "2026-01-01",
            updated_at: "2026-01-02",
          },
        ],
      },
      {
        id: "user-1",
        email: "auth@example.com",
        user_metadata: { full_name: "Auth Name" },
      }
    );
    const api = createApi(client);

    await expect(api.getUser()).resolves.toMatchObject({
      id: "user-1",
      displayName: "Profile Name",
      email: "auth@example.com",
      headline: "Frontend engineer",
      targetRole: "Staff Frontend Engineer",
      location: "Stockholm",
      githubUrl: "https://github.com/profile",
      xp: 120,
      onboardingCompleted: true,
    });
  });

  it("falls back to auth metadata when the profile row is missing", async () => {
    const { client } = fakeSupabase(
      { profiles: [] },
      { id: "user-1", email: "auth@example.com", user_metadata: { full_name: "Auth Name" } }
    );
    const api = createApi(client);

    await expect(api.getUser()).resolves.toMatchObject({
      id: "user-1",
      displayName: "Auth Name",
      email: "auth@example.com",
      xp: 0,
      onboardingCompleted: false,
    });
  });

  it("updates editable profile fields without changing auth-owned email", async () => {
    const { client, calls } = fakeSupabase(
      {},
      { id: "user-1", email: "auth@example.com", user_metadata: {} }
    );
    const api = createApi(client);

    const saved = await api.updateProfile({
      displayName: "  Ada  ",
      targetRole: "Principal Engineer",
      githubUrl: "",
      onboardingCompleted: true,
    });

    expect(calls.updates[0]).toMatchObject({
      table: "profiles",
      rows: {
        user_id: "user-1",
        email: "auth@example.com",
        display_name: "Ada",
        target_role: "Principal Engineer",
        github_url: null,
        onboarding_completed: true,
      },
    });
    expect(saved).toMatchObject({ id: "user-1", displayName: "Ada", email: "auth@example.com" });
  });

  it("lists saved boards from newest to oldest", async () => {
    const { client } = fakeSupabase({
      arch_boards: [
        {
          id: "board-1",
          title: "Payment draft",
          scenario_id: "payment",
          nodes: [{ id: "n1", type: "client", x: 0, y: 0 }],
          edges: [],
          created_at: "2026-01-01",
          updated_at: "2026-01-02",
        },
      ],
    });
    const api = createApi(client);

    await expect(api.listBoards()).resolves.toEqual([
      {
        id: "board-1",
        title: "Payment draft",
        scenarioId: "payment",
        nodes: [{ id: "n1", type: "client", x: 0, y: 0 }],
        edges: [],
        createdAt: "2026-01-01",
        updatedAt: "2026-01-02",
      },
    ]);
  });

  it("saves a new board snapshot", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    const board = await api.upsertBoard({
      title: "Catalog board",
      scenarioId: "catalog",
      nodes: [{ id: "n1", type: "cdn", x: 10, y: 20 }],
      edges: [],
    });

    expect(calls.inserts[0]).toMatchObject({
      table: "arch_boards",
      rows: { title: "Catalog board", scenario_id: "catalog", nodes: [{ id: "n1", type: "cdn", x: 10, y: 20 }], edges: [] },
    });
    expect(board).toMatchObject({ id: "new-id", title: "Catalog board", scenarioId: "catalog" });
  });

  it("updates an existing board snapshot", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    await api.upsertBoard({ id: "board-1", title: "Payment v2", scenarioId: "payment", nodes: [], edges: [] });

    expect(calls.updates[0]).toMatchObject({
      table: "arch_boards",
      rows: { title: "Payment v2", scenario_id: "payment", nodes: [], edges: [] },
    });
  });

  it("returns an accuracy timeline from answer events", async () => {
    const { client } = fakeSupabase({
      answer_events: [
        { correct: true, created_at: "2026-01-01T10:00:00Z" },
        { correct: false, created_at: "2026-01-02T10:00:00Z" },
      ],
    });
    const api = createApi(client);

    await expect(api.getAccuracyTimeline()).resolves.toEqual([
      { date: "2026-01-01", accuracy: 1, correct: 1, total: 1 },
      { date: "2026-01-02", accuracy: 0.5, correct: 1, total: 2 },
    ]);
  });

  it("records a correct answer as an event plus an XP increment", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    await api.recordAnswer("Kubernetes", true, "drill");
    expect(calls.inserts).toEqual([
      { table: "answer_events", rows: { tech: "Kubernetes", correct: true, source: "drill", difficulty: null } },
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

  it("stores the tier and awards scaled XP for a tiered answer", async () => {
    const { client, calls } = fakeSupabase();
    const api = createApi(client);

    await api.recordAnswer("TypeScript", true, "drill", "ultra");
    expect(calls.inserts).toEqual([
      { table: "answer_events", rows: { tech: "TypeScript", correct: true, source: "drill", difficulty: "ultra" } },
    ]);
    expect(calls.rpcs).toEqual([{ fn: "add_xp", args: { points: difficultyByKey("ultra").xp } }]);
  });

  it("resets XP and answer history for the signed-in user", async () => {
    const { client, calls } = fakeSupabase(
      {},
      { id: "user-1", email: "auth@example.com", user_metadata: {} }
    );
    const api = createApi(client);

    await expect(api.resetScores()).resolves.toEqual({ xp: 0, answers: {} });
    expect(calls.deletes).toEqual([{ table: "answer_events" }]);
    expect(calls.updates[0]).toMatchObject({
      table: "profiles",
      rows: { user_id: "user-1", email: "auth@example.com", xp: 0 },
    });
  });

  it("fetches tiered questions for the given techs", async () => {
    const rows = [
      { id: "q1", tech: "TypeScript", category: "Languages", difficulty: "mid", prompt: "p", options: ["a", "b", "c", "d"], correct: 0, explanation: null },
    ];
    const { client } = fakeSupabase({ questions: rows });
    const api = createApi(client);

    await expect(api.getQuestions({ techs: ["TypeScript"], difficulty: "mid", limit: 10 })).resolves.toEqual(rows);
  });

  it("returns no questions (and skips the query) when no techs are given", async () => {
    const { client } = fakeSupabase({ questions: [{ id: "q1" }] });
    const api = createApi(client);

    await expect(api.getQuestions({ techs: [], difficulty: "mid" })).resolves.toEqual([]);
  });
});
