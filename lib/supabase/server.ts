import { createSupabaseSSRClient } from "@/lib/supabase/ssr";

export async function createSupabaseServerClient() {
  return createSupabaseSSRClient();
}

/** @deprecated Utiliser createSupabaseServerClient */
export const createClient = createSupabaseServerClient;
