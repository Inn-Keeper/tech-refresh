import { createApi } from "@tech-refresh/core/api";
import { createPipelineApi } from "@tech-refresh/core/pipeline";
import { supabase } from "./supabase";

export const api = createApi(supabase);

const pipelineUrl = process.env.EXPO_PUBLIC_PIPELINE_URL ?? "";
export const pipeline = createPipelineApi(
  async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  pipelineUrl
);
