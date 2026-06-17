// app/dashboard/page.tsx
// Page PROXY — vérifie l'autorisation AVANT tout rendu
// Pas de middleware, pas de client-side check — tout côté serveur

import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/rbac/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await getServerRBACSession();

  // Non authentifié → login
  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const { level } = session;

  // =============================================================================
  // BLOCAGE LEVEL 6 (USER/CLIENT) — REDIRECTION VERS PAGE D'ERREUR
  // =============================================================================
  // Le dashboard est STRICTEMENT réservé au staff (niveaux 1-5)
  // Level 6 = CLIENT = aucun accès, même en lecture seule

  if (level >= 6) {
    redirect("/unauthorized");
  }

  // ✅ Level 1-5 : rendu du contenu dashboard
  return <DashboardContent session={session} />;
}