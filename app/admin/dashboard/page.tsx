// app/admin/dashboard/page.tsx

// Page PROXY — vérifie l'autorisation AVANT tout rendu
// Pas de middleware, pas de client-side check — tout côté serveur

import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { hasFreshAdminPinEntry, isPinEnabled } from "@/lib/pin/admin-pin";

export default async function DashboardPage() {
  const session = await getServerRBACSession();

// Non authentifié → login
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

// Le dashboard est STRICTEMENT réservé au staff Admin (niveaux 1-2)
  if (session.level >= 3) {
    redirect("/unauthorized");
  }

      const pinEnabled = await isPinEnabled();
      const pinEntryFresh = pinEnabled
       ? await hasFreshAdminPinEntry(session.userId)
       : true;
   
  // ✅ Level 1-2 : rendu du contenu dashboard
  return (
    <div className="min-h-screen bg-cyan-100 p-1 text-cyan-600 md:p-3">
      {pinEntryFresh ? (
        <div className="mt-8 sticky top-28 self-start">
          <DashboardContent session={session} />
        </div>
      ) : (
        <div className="mt-8">
          <AdminPinGate />
        </div>
      )}
    </div>
  );
}
