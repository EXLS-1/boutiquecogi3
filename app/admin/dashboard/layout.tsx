// app/admin/dashboard/layout.tsx
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { getSessionWithUser } from "@/lib/auth/rbac";
import {
  getClientPermissions,
  getClientRestrictions,
  isRestrictionEnabled,
  RESTRICTIONS,
  type Role,
} from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { PermissionCode } from "@/lib/auth/rbac-shared";

type DashboardLayoutProps = { children: ReactNode };

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  let session: Awaited<ReturnType<typeof getServerRBACSession>> | null = null;

  try {
    session = await getServerRBACSession();
  } catch (error) {
    console.error("[DashboardLayout] Failed to fetch RBAC session:", error);
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  const userSession = await getSessionWithUser();
  if (!session || !userSession?.user) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  // Garde-fou corrigé : rejet si le rôle ou le niveau est absent/invalid
  if (!session.role || typeof session.role !== "object") {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  const roleName = session.role.name;

  if (typeof roleName !== "string" || roleName.length === 0) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  if (session.level === null || session.level === undefined || typeof session.level !== "number") {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  if (session.level > 2) {
    redirect("/unauthorized");
  }

  const role = roleName.toUpperCase() as Role;

  let permissions = await getClientPermissions(role);
  let restrictions = await getClientRestrictions(role);
  let requiresAuditApproval: boolean = false;

  try {
    const results = await Promise.all([
      getClientPermissions(role),
      getClientRestrictions(role),
      isRestrictionEnabled(role, RESTRICTIONS.REQUIRES_AUDIT_APPROVAL),
    ]);

    permissions = results[0];
    restrictions = results[1];
    requiresAuditApproval = results[2] === true;
  } catch (error) {
    console.error("[DashboardLayout] Failed to load role permissions/restrictions:", error);
    permissions = [];
    restrictions = await getClientRestrictions(role);
    requiresAuditApproval = false;
  }

  // The server RBAC catalog still emits the legacy auditlog spelling. The
  // client provider uses the shared permission catalog, so normalize it here.
  const safeInitialPermissions: PermissionCode[] = permissions.map((permission) =>
    (permission === "auditlog:view-logs" ? "audit:view-logs" : permission) as PermissionCode,
  );

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={session.level}
      initialPermissions={safeInitialPermissions}
      initialRestrictions={restrictions ?? []}
      requiresAuditApproval={requiresAuditApproval}
    >
      <DashboardShell
        userEmail={userSession.user.email ?? ""}
        userName={userSession.user.name ?? null}
        userImage={userSession.user.image ?? null}
      >
        {children}
      </DashboardShell>
    </SwitchProvider>
  );
}
