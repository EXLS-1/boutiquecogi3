// app/admin/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import {
  getClientPermissions,
  getClientRestrictions,
  RESTRICTIONS,
  type Role,
} from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import {
  PERMISSIONS,
  ROLE_TO_LEVEL,
  type PermissionCode,
} from "@/lib/auth/rbac-shared";

type DashboardLayoutProps = { children: ReactNode };

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await getServerRBACSession();
  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin/dashboard");
  }

  const role = Object.keys(ROLE_TO_LEVEL).find(
    (candidate): candidate is Role => candidate === session.roleCode,
  );
  if (
    !role ||
    !Number.isInteger(session.level) ||
    session.level < 1 ||
    session.level > 2 ||
    ROLE_TO_LEVEL[role] !== session.level
  ) {
    redirect("/unauthorized");
  }

  const [permissions, restrictions] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
  ]);
  const requiresAuditApproval =
    restrictions[RESTRICTIONS.REQUIRES_AUDIT_APPROVAL] === "ON";

  // The server RBAC catalog still emits the legacy auditlog spelling. The
  // client provider uses the shared permission catalog, so normalize it here.
  const validPermissionCodes = new Set<PermissionCode>(
    Object.values(PERMISSIONS),
  );
  const isPermissionCode = (code: string): code is PermissionCode =>
    validPermissionCodes.has(code as PermissionCode);
  const safeInitialPermissions: PermissionCode[] = permissions.flatMap(
    (permission) => {
      const permissionCode: string = permission;
      const normalized =
        permissionCode === "auditlog:view-logs"
          ? "audit:view-logs"
          : permissionCode;
      return isPermissionCode(normalized)
        ? [normalized]
        : [];
    },
  );

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={session.level}
      initialPermissions={safeInitialPermissions}
      initialRestrictions={restrictions}
      requiresAuditApproval={requiresAuditApproval}
    >
      {children}
    </SwitchProvider>
  );
}
