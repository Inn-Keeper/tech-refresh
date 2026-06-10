// Thin binding of the shared data layer to this app's Supabase client.
import { createApi, dateToUi, dateToDb } from "@tech-refresh/core/api";
import { supabase } from "./supabase.js";

const api = createApi(supabase);

export { dateToUi, dateToDb };
export const {
  listContacts,
  upsertContact,
  deleteContact,
  addRetro,
  deleteRetro,
  listStories,
  upsertStory,
  deleteStory,
  getScores,
  recordAnswer,
  addXp,
} = api;
