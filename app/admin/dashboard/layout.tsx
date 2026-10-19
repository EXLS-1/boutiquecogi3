// app/admin/dashboard/layout.tsx
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

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await getServerRBACSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  if (session.level > 2) {
    redirect("/unauthorized");
  }

  const roleName = session.role.name as Role;

  // Exécution parallèle optimisée des politiques de sécurité et des permissions
  const [permissions, restrictions, requiresAuditApproval] = await Promise.all([
    getClientPermissions(roleName),
    getClientRestrictions(roleName),
    isRestrictionEnabled(roleName, RESTRICTIONS.REQUIRES_AUDIT_APPROVAL),
  ]);

  return (
    <SwitchProvider
      initialRole={roleName}
      initialLevel={session.level}
      initialPermissions={permissions.map((permission) =>
        permission === "auditlog:view-logs" ? "audit:view-logs" : permission
      )}
      initialRestrictions={restrictions}
      requiresAuditApproval={requiresAuditApproval}
    >
      <DashboardShell
        userEmail={session.user.email ?? ""}
        userName={session.user.name ?? null}
        userImage={session.user.image ?? null}
      >
        {children}
      </DashboardShell>
    </SwitchProvider>
  );
}
