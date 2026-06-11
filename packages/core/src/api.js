// Data layer: Supabase queries + snake_case<->camelCase and date mapping.
// UI keeps DD-MM-YYYY strings; Postgres stores real dates.
import { CORRECT_XP } from "./gamification.js";

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
 * @param {any} supabase
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
 *   recordAnswer(tech: string, correct: boolean, source?: string): Promise<void>,
 *   addXp(points: number): Promise<void>,
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

  async function recordAnswer(tech, correct, source = "card") {
    const { error } = await supabase.from("answer_events").insert({ tech, correct, source });
    if (error) fail(error);
    if (correct) await addXp(CORRECT_XP);
  }

  async function addXp(points) {
    const { error } = await supabase.rpc("add_xp", { points });
    if (error) fail(error);
  }

  return { listContacts, upsertContact, deleteContact, addRetro, deleteRetro, listStories, upsertStory, deleteStory, getScores, recordAnswer, addXp };
}
