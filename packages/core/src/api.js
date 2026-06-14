// Data layer: Supabase queries + snake_case<->camelCase and date mapping.
// UI keeps DD-MM-YYYY strings; Postgres stores real dates.
import { buildAccuracyTimeline } from "./accuracy.js";
import { CORRECT_XP } from "./gamification.js";
import { difficultyByKey } from "./difficulty.js";

/**
 * @typedef {object} Retro
 * @property {string} id
 * @property {string} round
 * @property {string} questions
 * @property {string} wentWell
 * @property {string} toImprove
 * @property {string} date
 */

/**
 * @typedef {object} Contact
 * @property {string} [id]
 * @property {string} name
 * @property {string} status
 * @property {string} role
 * @property {string} link
 * @property {string} note
 * @property {string} date
 * @property {string} nextAction
 * @property {string} nextActionDate
 * @property {Retro[]} [retros]
 */

/**
 * @typedef {object} Story
 * @property {string} [id]
 * @property {string} title
 * @property {string} competency
 * @property {string} situation
 * @property {string} task
 * @property {string} action
 * @property {string} result
 */

/**
 * @typedef {object} Scores
 * @property {number} xp
 * @property {Record<string, { correct: number, wrong: number }>} answers
 */

/**
 * @typedef {object} AccuracyPoint
 * @property {string} date
 * @property {number} accuracy
 * @property {number} correct
 * @property {number} total
 */

/**
 * @typedef {object} SavedBoard
 * @property {string} [id]
 * @property {string} title
 * @property {string} scenarioId
 * @property {import("./arch.js").BoardNode[]} nodes
 * @property {import("./arch.js").BoardEdge[]} edges
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {object} User
 * @property {string} id
 * @property {string} displayName
 * @property {string} email
 * @property {string} avatarUrl
 * @property {string} headline
 * @property {string} targetRole
 * @property {string} location
 * @property {string} portfolioUrl
 * @property {string} githubUrl
 * @property {boolean} useGithubTechsForPrep
 * @property {string} linkedinUrl
 * @property {string} timezone
 * @property {boolean} onboardingCompleted
 * @property {number} xp
 * @property {string | null} createdAt
 * @property {string | null} updatedAt
 */

/**
 * @typedef {object} SupabaseClient
 * @property {(table: string) => object} from
 * Minimal Supabase client interface for type safety
 */

export const dateToUi = (iso) => (iso ? iso.split("-").reverse().join("-") : "");
export const dateToDb = (ddmmyyyy) => {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy || "");
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

const fail = (error) => {
  throw new Error(error.message);
};

/**
 * Binds the data layer to a Supabase client (browser or React Native).
 * @param {SupabaseClient} supabase
 * @returns {{
 *   listContacts(): Promise<Contact[]>,
 *   upsertContact(contact: Contact): Promise<void>,
 *   deleteContact(id: string | undefined): Promise<void>,
 *   addRetro(contactId: string, retro: Omit<Retro, "id" | "date"> & { date?: string }): Promise<void>,
 *   deleteRetro(id: string): Promise<void>,
 *   listStories(): Promise<Story[]>,
 *   upsertStory(story: Story): Promise<void>,
 *   deleteStory(id: string | undefined): Promise<void>,
 *   getScores(): Promise<Scores>,
 *   getAccuracyTimeline(): Promise<AccuracyPoint[]>,
 *   getQuestions(args: { techs: string[], difficulty: string, limit?: number }): Promise<{ id: string, tech: string, category: string, difficulty: string, prompt: string, options: string[], correct: number, explanation: string | null }[]>,
 *   recordAnswer(tech: string, correct: boolean, source?: string, difficulty?: string | null): Promise<void>,
 *   addXp(points: number): Promise<void>,
 *   resetScores(): Promise<Scores>,
 *   listBoards(): Promise<SavedBoard[]>,
 *   upsertBoard(board: SavedBoard): Promise<SavedBoard>,
 *   deleteBoard(id: string | undefined): Promise<void>,
 *   listCustomScenarios(): Promise<{ id: string, name: string, brief: string, budget: number, checks: object[] }[]>,
 *   upsertCustomScenario(s: object): Promise<object>,
 *   deleteCustomScenario(id: string): Promise<void>,
 *   listStatusEvents(): Promise<{ contactId: string, status: string, createdAt: string }[]>,
 *   getUser(): Promise<User | null>,
 *   updateProfile(profile: Partial<User>): Promise<User>
 * }}
 */
export function createApi(supabase) {
  // ── contacts ──────────────────────────────────────────────────────────────────

  const contactToUi = (r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    role: r.role ?? "",
    link: r.link ?? "",
    note: r.note ?? "",
    date: dateToUi(r.date),
    nextAction: r.next_action ?? "",
    nextActionDate: dateToUi(r.next_action_date),
    retros: (r.retros ?? [])
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((x) => ({
        id: x.id,
        round: x.round ?? "",
        questions: x.questions ?? "",
        wentWell: x.went_well ?? "",
        toImprove: x.to_improve ?? "",
        date: dateToUi(x.date),
      })),
  });

  const contactToDb = (c) => ({
    name: c.name,
    status: c.status,
    role: c.role || null,
    link: c.link || null,
    note: c.note || null,
    date: dateToDb(c.date),
    next_action: c.nextAction || null,
    next_action_date: dateToDb(c.nextActionDate),
  });

  async function listContacts() {
    const { data, error } = await supabase
      .from("contacts")
      .select("*, retros(*)")
      .order("created_at");
    if (error) fail(error);
    return data.map(contactToUi);
  }

  async function upsertContact(c) {
    const row = contactToDb(c);
    const q = c.id
      ? supabase.from("contacts").update(row).eq("id", c.id)
      : supabase.from("contacts").insert(row);
    const { error } = await q;
    if (error) fail(error);
  }

  async function deleteContact(id) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) fail(error);
  }

  async function addRetro(contactId, retro) {
    const { error } = await supabase.from("retros").insert({
      contact_id: contactId,
      round: retro.round || null,
      questions: retro.questions || null,
      went_well: retro.wentWell || null,
      to_improve: retro.toImprove || null,
    });
    if (error) fail(error);
  }

  async function deleteRetro(id) {
    const { error } = await supabase.from("retros").delete().eq("id", id);
    if (error) fail(error);
  }

  // ── stories ───────────────────────────────────────────────────────────────────

  const storyToUi = (r) => ({
    id: r.id,
    title: r.title,
    competency: r.competency,
    situation: r.situation ?? "",
    task: r.task ?? "",
    action: r.action ?? "",
    result: r.result ?? "",
  });

  const storyToDb = (s) => ({
    title: s.title,
    competency: s.competency,
    situation: s.situation || null,
    task: s.task || null,
    action: s.action || null,
    result: s.result || null,
  });

  async function listStories() {
    const { data, error } = await supabase.from("stories").select("*").order("created_at");
    if (error) fail(error);
    return data.map(storyToUi);
  }

  async function upsertStory(s) {
    const row = storyToDb(s);
    const q = s.id
      ? supabase.from("stories").update(row).eq("id", s.id)
      : supabase.from("stories").insert(row);
    const { error } = await q;
    if (error) fail(error);
  }

  async function deleteStory(id) {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) fail(error);
  }

  // ── arch boards ───────────────────────────────────────────────────────────────

  const boardToUi = (r) => ({
    id: r.id,
    title: r.title,
    scenarioId: r.scenario_id,
    nodes: r.nodes ?? [],
    edges: r.edges ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

  const boardToDb = (b) => ({
    title: b.title,
    scenario_id: b.scenarioId,
    nodes: b.nodes ?? [],
    edges: b.edges ?? [],
  });

  async function listBoards() {
    const { data, error } = await supabase.from("arch_boards").select("*").order("updated_at", { ascending: false });
    if (error) fail(error);
    return data.map(boardToUi);
  }

  async function upsertBoard(board) {
    const row = boardToDb(board);
    const q = board.id
      ? supabase.from("arch_boards").update(row).eq("id", board.id)
      : supabase.from("arch_boards").insert(row);
    const { data, error } = await q.select("*").single();
    if (error) fail(error);
    return boardToUi(data);
  }

  async function deleteBoard(id) {
    const { error } = await supabase.from("arch_boards").delete().eq("id", id);
    if (error) fail(error);
  }

  // ── custom scenarios ──────────────────────────────────────────────────────────

  const scenarioToUi = (r) => ({
    id: r.id,
    name: r.name,
    brief: r.brief ?? "",
    budget: r.budget,
    checks: r.checks ?? [],
  });

  const scenarioToDb = (s) => ({
    name: s.name,
    brief: s.brief ?? "",
    budget: s.budget,
    checks: s.checks ?? [],
  });

  async function listCustomScenarios() {
    const { data, error } = await supabase.from("custom_scenarios").select("*").order("created_at");
    if (error) fail(error);
    return data.map(scenarioToUi);
  }

  async function upsertCustomScenario(s) {
    const row = scenarioToDb(s);
    const q = s.id
      ? supabase.from("custom_scenarios").update(row).eq("id", s.id)
      : supabase.from("custom_scenarios").insert(row);
    const { data, error } = await q.select("*").single();
    if (error) fail(error);
    return scenarioToUi(data);
  }

  async function deleteCustomScenario(id) {
    const { error } = await supabase.from("custom_scenarios").delete().eq("id", id);
    if (error) fail(error);
  }

  /** @returns {Promise<{ contactId: string, status: string, createdAt: string }[]>} */
  async function listStatusEvents() {
    const { data, error } = await supabase
      .from("status_events")
      .select("contact_id, status, created_at")
      .order("created_at");
    if (error) fail(error);
    return data.map((row) => ({ contactId: row.contact_id, status: row.status, createdAt: row.created_at }));
  }

  // ── scores ────────────────────────────────────────────────────────────────────

  async function getScores() {
    const [profile, events] = await Promise.all([
      supabase.from("profiles").select("xp").maybeSingle(),
      supabase.from("answer_events").select("tech, correct"),
    ]);
    if (profile.error) fail(profile.error);
    if (events.error) fail(events.error);

    const answers = {};
    for (const e of events.data) {
      const a = (answers[e.tech] ??= { correct: 0, wrong: 0 });
      if (e.correct) a.correct += 1;
      else a.wrong += 1;
    }
    return { xp: profile.data?.xp ?? 0, answers };
  }

  async function getAccuracyTimeline() {
    const { data, error } = await supabase
      .from("answer_events")
      .select("correct, created_at")
      .order("created_at");
    if (error) fail(error);
    return buildAccuracyTimeline(data);
  }

  /**
   * Fetches tiered quiz questions for the given techs at one difficulty.
   * @param {{ techs: string[], difficulty: string, limit?: number }} args
   * @returns {Promise<{ id: string, tech: string, category: string, difficulty: string, prompt: string, options: string[], correct: number, explanation: string | null }[]>}
   */
  async function getQuestions({ techs, difficulty, limit = 10 }) {
    if (!techs?.length) return [];
    const { data, error } = await supabase
      .from("questions")
      .select("id, tech, category, difficulty, prompt, options, correct, explanation")
      .in("tech", techs)
      .eq("difficulty", difficulty)
      .limit(limit);
    if (error) fail(error);
    return data;
  }

  // `difficulty` is optional: tiered drills pass a tier (scaled XP), while the
  // flip cards omit it and fall back to the flat CORRECT_XP reward.
  async function recordAnswer(tech, correct, source = "card", difficulty = null) {
    const { error } = await supabase
      .from("answer_events")
      .insert({ tech, correct, source, difficulty });
    if (error) fail(error);
    if (correct) {
      const points = difficultyByKey(difficulty)?.xp ?? CORRECT_XP;
      try {
        await addXp(points);
      } catch (err) {
        console.error("Failed to award XP after recording answer:", err);
        throw err;
      }
    }
  }

  async function addXp(points) {
    const { error } = await supabase.rpc("add_xp", { points });
    if (error) fail(error);
  }

  async function resetScores() {
    const auth = await supabase.auth.getUser();
    if (auth.error) fail(auth.error);
    if (!auth.data.user) throw new Error("No signed-in user.");

    const answers = await supabase.from("answer_events").delete().eq("user_id", auth.data.user.id);
    if (answers.error) fail(answers.error);

    const profile = await supabase
      .from("profiles")
      .upsert({ user_id: auth.data.user.id, email: auth.data.user.email, xp: 0 });
    if (profile.error) fail(profile.error);

    return { xp: 0, answers: {} };
  }

  const profileToUi = (row, authUser = null) => {
    const metadata = authUser?.user_metadata ?? {};
    const githubUsername = metadata.user_name ?? metadata.preferred_username ?? "";
    return {
      id: row?.user_id ?? authUser?.id ?? "",
      displayName:
        row?.display_name ??
        metadata.display_name ??
        metadata.full_name ??
        metadata.name ??
        "",
      email: authUser?.email ?? row?.email ?? "",
      avatarUrl: row?.avatar_url ?? metadata.avatar_url ?? "",
      headline: row?.headline ?? "",
      targetRole: row?.target_role ?? "",
      location: row?.location ?? "",
      portfolioUrl: row?.portfolio_url ?? "",
      githubUrl: row?.github_url ?? (githubUsername ? `https://github.com/${githubUsername}` : ""),
      useGithubTechsForPrep: row?.use_github_techs_for_prep ?? false,
      linkedinUrl: row?.linkedin_url ?? "",
      timezone: row?.timezone ?? "",
      onboardingCompleted: row?.onboarding_completed ?? false,
      xp: row?.xp ?? 0,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
    };
  };

  const profileToDb = (profile) => {
    const row = {};
    const textFields = [
      ["displayName", "display_name"],
      ["avatarUrl", "avatar_url"],
      ["headline", "headline"],
      ["targetRole", "target_role"],
      ["location", "location"],
      ["portfolioUrl", "portfolio_url"],
      ["githubUrl", "github_url"],
      ["linkedinUrl", "linkedin_url"],
      ["timezone", "timezone"],
    ];
    for (const [uiKey, dbKey] of textFields) {
      if (uiKey in profile) row[dbKey] = profile[uiKey]?.trim() || null;
    }
    if ("onboardingCompleted" in profile) row.onboarding_completed = profile.onboardingCompleted ?? false;
    if ("useGithubTechsForPrep" in profile) row.use_github_techs_for_prep = profile.useGithubTechsForPrep ?? false;
    return row;
  };

  async function getUser() {
    const auth = await supabase.auth.getUser();
    if (auth.error) fail(auth.error);
    if (!auth.data.user) return null;

    const profile = await supabase.from("profiles").select("*").maybeSingle();
    if (profile.error) fail(profile.error);
    return profileToUi(profile.data, auth.data.user);
  }

  async function updateProfile(profile) {
    const auth = await supabase.auth.getUser();
    if (auth.error) fail(auth.error);
    if (!auth.data.user) throw new Error("No signed-in user.");

    const row = {
      user_id: auth.data.user.id,
      email: auth.data.user.email,
      ...profileToDb(profile),
    };
    const { data, error } = await supabase.from("profiles").upsert(row).select("*").single();
    if (error) fail(error);
    return profileToUi(data, auth.data.user);
  }

  return { listContacts, upsertContact, deleteContact, addRetro, deleteRetro, listStories, upsertStory, deleteStory, listBoards, upsertBoard, deleteBoard, listCustomScenarios, upsertCustomScenario, deleteCustomScenario, listStatusEvents, getScores, getAccuracyTimeline, getQuestions, recordAnswer, addXp, resetScores, getUser, updateProfile };
}
