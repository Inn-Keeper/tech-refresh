// Thin binding of the shared data layer to this app's Supabase client.
import { createApi, dateToUi, dateToDb } from "@tech-refresh/core/api";
import { createPipelineApi, PipelineApiError } from "@tech-refresh/core/pipeline";
import { supabase } from "./supabase";

const pipelineUrl = import.meta.env.VITE_PIPELINE_URL ?? "";
let pipeline;
try {
  pipeline = createPipelineApi(
    async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        console.warn("⚠️ No Supabase session — sign in to use pipeline analytics");
      }
      return token ?? null;
    },
    pipelineUrl
  );
} catch (error) {
  // Pipeline URL not configured; create a stub that always fails gracefully
  pipeline = {
    async getVelocity() {
      throw new PipelineApiError("pipeline: not configured", { cause: error });
    }
  };
}

const api = createApi(supabase);

export { dateToUi, dateToDb, pipeline };
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
