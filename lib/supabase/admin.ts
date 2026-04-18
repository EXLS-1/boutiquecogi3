// lib/supabase/admin.ts
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase SERVICE_ROLE key manquante");
}

/**
 * ⚠️ CLIENT SUPABASE ADMIN
 * - Accès total à la base
 * - NE JAMAIS importer côté client
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey
);
