import { createApi } from "@tech-refresh/core/api";
import { supabase } from "./supabase";

export const api = createApi(supabase);
