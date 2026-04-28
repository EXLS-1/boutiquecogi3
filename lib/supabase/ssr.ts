import { updateSession } from "@/lib/auth/session";
import { cookies } from "next/headers";

export function createSupabaseSSRClient() {
  const cookieStore = cookies();

  return updateSession(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: async () => (await cookieStore).getAll(),
        setAll: () => {},
      },
    }
  );
}