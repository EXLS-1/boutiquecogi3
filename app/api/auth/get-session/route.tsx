import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

  // Initialisation du client Supabase côté serveur
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return NextResponse.json({ session: null, authenticated: false }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Le middleware gère déjà le rafraîchissement des jetons
          }
        },
      },
    }
  );

  try {
    /**
     * RIGOUREUX : Utiliser getUser() au lieu de getSession()
     * getSession() récupère les données du cookie sans vérification approfondie.
     * getUser() vérifie la validité du jeton JWT auprès de Supabase, 
     * ce qui empêche l'usurpation de session.
     */
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { session: null, authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        session: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          }
        }, 
        authenticated: true 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Erreur critique Auth Route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: "Échec de la récupération de session" },
      { status: 500 }
    );
  }
}