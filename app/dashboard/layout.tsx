// app/dashboard/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  requireAuth,
  getCurrentUserWithRole,
  getClientPermissions,
  getClientRestrictions,
  getRoleLevel,
} from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

type DashboardLayoutProps = {
  children: ReactNode;
};

// =============================================================================
// BLOCAGE LEVEL 6 (USER/CLIENT)
// =============================================================================
// Le dashboard est STRICTEMENT réservé au staff (niveaux 1-5)
// Level 6 = CLIENT = aucun accès, même en lecture seule

const DASHBOARD_MAX_ALLOWED_LEVEL = 5;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const role = await requireAuth("/login");
  const userData = await getCurrentUserWithRole();

  if (!userData) redirect("/login");

  const userLevel = getRoleLevel(role);

  // ❌ Level 6 (USER) et supérieur = redirection vers page d'erreur
  // ✅ Level 1-5 = accès autorisé
  if (userLevel > DASHBOARD_MAX_ALLOWED_LEVEL) {
    redirect("/unauthorized");
  }

  // Résolution parallèle des droits pour hydrater le provider client
  const [permissions, restrictions] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
  ]);

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={userLevel}
      initialPermissions={permissions}
      initialRestrictions={restrictions}
    >
      <DashboardShell
        userEmail={userData.user.email ?? ""}
        userName={userData.user.name ?? null}
        userImage={(userData.user as Record<string, unknown>).image as string | null | undefined}
      >
        {children}
      </DashboardShell>
    </SwitchProvider>
  );
}
