// app/admin/page.tsx
import { redirect } from "next/navigation";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { AdminModuleMain } from "@/components/admin/shared/admin-module-main";
import { AdminModuleNav } from "@/components/admin/shared/admin-module-nav";
import { AdminModuleSidebar } from "@/components/admin/shared/admin-module-sidebar";
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
    <div className="min-h-screen bg-cyan-100 p-1 text-cyan-600 md:p-3">
      {pinEntryFresh ? (
        <>
          {/* En-tête */}
          <header className="flex items-center justify-end border-b border-cyan-400 pb-6">
            <div className="flex items-center gap-4">
            </div>
          </header>

          {/* Contenu principal */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="sticky top-28 self-start">
              <AdminModuleSidebar
                groups={ADMIN_MODULE_GROUPS}
                activeGroupId={activeGroup.id}
                session={session}
              />
            </div>
            <div className="min-w-0 space-y-6">
               <AdminModuleNav modules={activeGroup.modules} />
              <AdminModuleMain group={activeGroup} />
            </div>
          </div>
        </>
      ) : (
        /* Portail PIN — seule chose visible si le code n'est pas frais */
        <div className="mt-8">
          <AdminPinGate />
        </div>
      )}
    </div>
  );
}