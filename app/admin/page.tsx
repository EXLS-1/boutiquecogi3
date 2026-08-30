// app/admin/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerRBACSession } from "@/lib/auth/server";
import { Button } from "@/components/ui/button";
import { AdminModuleShortcuts } from "@/components/admin/admin-module-shortcuts";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { Shield, ArrowRight } from "lucide-react";
import { isPinEnabled, hasFreshAdminPinEntry } from "@/lib/pin/admin-pin";

export const metadata = {
  title: "Administration Système Général | Central Security",
  description: "Portail d'administration réservé au personnel de niveau 1",
};

export default async function AdminPage() {
  const session = await getServerRBACSession();

  // 1. Authentification
  if (!session) redirect("/auth/sign-in?callbackUrl=/admin");

  // 2. Autorisation RBAC (niveaux 1-2)
  if (session.level > 1) redirect("/unauthorized");

  // 3. Code PIN : exige une vérification « fraîche » à CHAQUE entrée sur la
  //    page admin — refresh, retour depuis une autre page, ou après 1 min
  //    d'inactivité (garde du layout). Le gate se ré-affiche dès que la
  //    dernière saisie du code date de plus de ADMIN_PIN_ENTRY_GRACE_SEC.
  const pinEnabled = await isPinEnabled();
  const pinEntryFresh = pinEnabled
    ? await hasFreshAdminPinEntry(session.userId)
    : true;

  return (
    <div className="min-h-screen bg-cyan-100 text-cyan-400 p-6 md:p-10 space-y-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-mono uppercase tracking-widest font-semibold">
              Zone Privilégiée
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Portail Admin</h1>
          <p className="text-cyan-400 text-sm mt-1">
            Connecté en tant que{" "}
            <span className="text-rose-400 font-medium">{session.userId}</span>
            {" "}({session.role.name} — Niveau {session.level})
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-rouge-500"
        >
          <Link href="/" className="flex items-center gap-2">
            Retour à l&apos;accueil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Gate PIN ré-affiché à chaque refresh / retour / après inactivité.
          La protection de toute la section (RBAC → 2FA → PIN) et la garde
          d'inactivité sont assurées par app/admin/layout.tsx. */}
      {pinEntryFresh ? <AdminModuleShortcuts /> : <AdminPinGate />}
    </div>
  );
}
