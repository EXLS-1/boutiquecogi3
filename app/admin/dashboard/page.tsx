// app/admin/dashboard/page.tsx

// Page PROXY — vérifie l'autorisation AVANT tout rendu
// Pas de middleware, pas de client-side check — tout côté serveur

import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { hasFreshAdminPinEntry, isPinEnabled } from "@/lib/pin/admin-pin";

export default async function DashboardPage() {
  const session = await getServerRBACSession();

  // Non authentifié → login
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  // Le dashboard est STRICTEMENT réservé au staff Admin (niveaux 1-2).
  // Reject malformed levels as well as roles outside the allowed range.
  if (
    !Number.isInteger(session.level) ||
    session.level < 1 ||
    session.level > 2
  ) {
    redirect("/unauthorized");
  }

  const pinEnabled = await isPinEnabled();
  const pinEntryFresh = pinEnabled
    ? await hasFreshAdminPinEntry(session.userId)
    : true;

  // ✅ Level 1-2 : rendu du contenu dashboard
  return (
    <div>
      {pinEntryFresh ? (
        <DashboardShell
          userName={session.user.name}
          userEmail={session.user.email}
          userImage={session.user.image}
        >
          <div className="mt-8 sticky top-28 self-start">
            <DashboardContent session={session} />
          </div>
        </DashboardShell>
      ) : (
        <div className="mt-8">
          <AdminPinGate />
        </div>
      )}
    </div>
  );
}
