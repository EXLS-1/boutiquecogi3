// app/admin/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Shield } from "lucide-react";

import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { AdminModuleMain } from "@/components/admin/shared/admin-module-main";
import { AdminModuleNav } from "@/components/admin/shared/admin-module-nav";
import { AdminModuleSidebar } from "@/components/admin/shared/admin-module-sidebar";
import { Button } from "@/components/ui/button";
import { getServerRBACSession } from "@/lib/auth/server";
import {
  ADMIN_MODULE_GROUPS,
  resolveAdminGroup,
} from "@/lib/constants/admin-navigation";
import { hasFreshAdminPinEntry, isPinEnabled } from "@/lib/pin/admin-pin";

export const metadata = {
  title: "Administration Système Général | Central Security",
  description: "Portail d'administration réservé au personnel de niveau 1 & 2",
};

type AdminPageProps = {
  searchParams: Promise<{ group?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  /* -------- 1. Authentification ------------------------------------ */
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/sign-in?callbackUrl=/admin");

  /* -------- 2. Autorisation RBAC (niveaux 1–2) -------------------- */
  if (session.level > 2) redirect("/unauthorized");

  /* -------- 3. Fraîcheur du code PIN ------------------------------ */
  const pinEnabled = await isPinEnabled();
  const pinEntryFresh = pinEnabled
    ? await hasFreshAdminPinEntry(session.userId)
    : true;

  /* -------- 4. Résolution du groupe actif depuis l'URL ------------ */
  const { group } = await searchParams;
  const activeGroup = resolveAdminGroup(group);

  return (
    <div className="min-h-screen bg-cyan-100 p-6 text-cyan-900 md:p-10">
      {/* En-tête */}
      <header className="flex flex-col gap-4 border-b border-cyan-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-emerald-600">
            <Shield className="h-5 w-5" aria-hidden="true" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest">
              Zone privilégiée
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Portail Admin</h1>
          <p className="mt-1 text-sm text-cyan-700">
            Connecté en tant que{" "}
            <span className="font-medium text-rose-500">
              {session.userId}
            </span>{" "}
            — {session.role.name} (niveau {session.level})
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="border-cyan-300 bg-white text-rose-500 hover:bg-cyan-50"
        >
          <Link href="/" className="flex items-center gap-2">
            Retour à l&apos;accueil
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </header>

      {/* Contenu protégé par le code PIN */}
      {pinEntryFresh ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <AdminModuleSidebar
            groups={ADMIN_MODULE_GROUPS}
            activeGroupId={activeGroup.id}
          />

          <div className="min-w-0 space-y-6">
            <AdminModuleNav modules={activeGroup.modules} />
            <AdminModuleMain group={activeGroup} />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <AdminPinGate />
        </div>
      )}
    </div>
  );
}
