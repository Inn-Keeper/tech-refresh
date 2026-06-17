// Thin binding of the shared data layer to this app's Supabase client.
import { createApi, dateToUi, dateToDb } from "@tech-refresh/core/api";
import { createPipelineApi } from "@tech-refresh/core/pipeline";
import { supabase } from "./supabase";

const pipelineUrl = import.meta.env.VITE_PIPELINE_URL ?? "";
export const pipeline = createPipelineApi(
  async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  pipelineUrl
);

const api = createApi(supabase);

export { dateToUi, dateToDb };
export const {
  listBoards,
  upsertBoard,
  deleteBoard,
  listCustomScenarios,
  upsertCustomScenario,
  deleteCustomScenario,
  listStatusEvents,
  getAccuracyTimeline,
  listContacts,
  upsertContact,
  deleteContact,
  addRetro,
  deleteRetro,
  listStories,
  upsertStory,
  deleteStory,
  getScores,
  getQuestions,
  recordAnswer,
  addXp,
  resetScores,
  getUser,
  updateProfile
} = api;
