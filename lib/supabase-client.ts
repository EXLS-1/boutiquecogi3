import { createClient } from "@supabase/supabase-js";

export const createAuthenticatedSupabaseClient = async () => {
  // 1. Appel à notre propre API pour récupérer le jeton
  const response = await fetch("/api/auth/supabase-token");
  
  if (!response.ok) {
    throw new Error("Impossible de récupérer le jeton d'accès");
  }

  const { token } = await response.json();

  // 2. Initialisation du client Supabase avec le jeton personnalisé
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
};