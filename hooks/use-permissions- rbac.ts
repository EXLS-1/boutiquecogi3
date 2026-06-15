// /hooks/usePermissions.ts
"use client";

import { useCallback } from "react";
import { Permission } from "@/lib/auth/rbac";

export function usePermissions(userPermissions: Permission[]) {
  const permSet = new Set(userPermissions);

  const can = useCallback(
    (permission: Permission): boolean => permSet.has(permission),
    [permSet],
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean =>
      permissions.every((p) => permSet.has(p)),
    [permSet],
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean =>
      permissions.some((p) => permSet.has(p)),
    [permSet],
  );

  return { can, canAll, canAny, permissions: userPermissions };
}
