// app/dashboard/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import {
  getClientPermissions,
  getClientRestrictions,
  isRestrictionEnabled,
  RESTRICTIONS,
  type Role,
} from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

type DashboardLayoutProps = { children: ReactNode };

const DASHBOARD_MAX_ALLOWED_LEVEL = 5;

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerRBACSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/dashboard");
  }

  // Vérification uniforme du niveau RBAC
  if (session.level > DASHBOARD_MAX_ALLOWED_LEVEL) {
    redirect("/unauthorized");
  }

  const roleName = session.role.name as Role;

  const [permissions, restrictions, requiresAuditApproval] = await Promise.all([
    getClientPermissions(roleName),
    getClientRestrictions(roleName),
    isRestrictionEnabled(roleName, RESTRICTIONS.REQUIRES_AUDIT_APPROVAL),
  ]);

  return (
    <SwitchProvider
      initialRole={roleName}
      initialLevel={session.level}
      initialPermissions={permissions}
      initialRestrictions={restrictions}
      requiresAuditApproval={requiresAuditApproval}
    >
      <DashboardShell
        userEmail={""}
        userName={null}
        userImage={null}
      >
        {children}
      </DashboardShell>
    </SwitchProvider>
  );
}
