// app/dashboard/layout.tsx

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  requireAuth,
  getCurrentUserWithRole,
  getClientPermissions,
  getClientRestrictions,
  getRoleLevel,
  isRestrictionEnabled,
  RESTRICTIONS,
} from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

type DashboardLayoutProps = { children: ReactNode };

const DASHBOARD_MAX_ALLOWED_LEVEL = 5;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const role = await requireAuth("/auth/sign-in");
  const userData = await getCurrentUserWithRole();

  if (!userData) redirect("/auth/sign-in");

  const userLevel = getRoleLevel(role);

  if (userLevel > DASHBOARD_MAX_ALLOWED_LEVEL) {
    redirect("/unauthorized");
  }

  const [permissions, restrictions, requiresAuditApproval] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
    isRestrictionEnabled(role, RESTRICTIONS.REQUIRES_AUDIT_APPROVAL),
  ]);

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={userLevel}
      initialPermissions={permissions}
      initialRestrictions={restrictions}
      requiresAuditApproval={requiresAuditApproval}
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
