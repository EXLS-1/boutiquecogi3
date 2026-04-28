import { createSupabaseSSRClient } from "@/lib/supabase/ssr";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(p0: string, p1: string, p2: { cookies: { getAll: () => Promise<RequestCookie[]>; setAll: () => void; }; }, request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return response;

  const supabase = createSupabaseSSRClient();
  supabase.auth.setSession(request.cookies.getAll());
        );

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // ⚠️ Sync technique uniquement
  await supabase.auth.getClaims();

  return response;
}