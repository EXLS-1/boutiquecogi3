// app/admin/dashboard/page.tsx

// Page PROXY — vérifie l'autorisation AVANT tout rendu
// Pas de middleware, pas de client-side check — tout côté serveur

import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await getServerRBACSession();

// Non authentifié → login
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/dashboard");
  }

// Le dashboard est STRICTEMENT réservé au staff Admin (niveaux 1-2)

  if (session.level >= 3) {
    redirect("/unauthorized");
  }

  // ✅ Level 1-2 : rendu du contenu dashboard
  return <DashboardContent session={session} />;
}
