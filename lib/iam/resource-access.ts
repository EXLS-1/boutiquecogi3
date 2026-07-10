import {
  type AuthContext,
  type Role,
  type Permission,
  type Restriction,
  AuthorizationError,
} from "@/lib/auth/server";

import { PERMISSIONS, RESTRICTIONS, type ToggleState, ROLES } from "@/lib/auth/rbac";

export type ResourceAccessCheck = {
  action: string;
  resource: string;
  resourceId?: string;

  // Règles “par ressource” (issus des configs Prisma)
  requiredPermission?: Permission | null;
  minRoleLevel?: number | null; // convention existante: level 1 (plus permissif) ... 7 (moins)

  // Restrictions (ex: restricted_to_own_data)
  restriction?: Restriction | null;

  // Ownership optionnel (si tu veux imposer un filtre userId)
  ownership?: {
    // true => exige que context.user.id === ownershipUserId
    ownershipUserId?: string | null;
  };

  // Options
  auditDetails?: unknown;
};

function isMinRoleLevelSatisfied(contextLevel: number, minRoleLevel: number) {
  // Conformément à lib/auth/server.ts: condition rejet si level > minLevel
  return contextLevel <= minRoleLevel;
}

export async function assertResourceAccess(
  context: AuthContext,
  check: ResourceAccessCheck,
): Promise<void> {
  const {
    action,
    resource,
    resourceId,
    requiredPermission,
    minRoleLevel,
    restriction,
    ownership,
  } = check;

  if (requiredPermission) {
    if (!context.permissions.has(requiredPermission)) {
      throw new AuthorizationError(
        `Permission '${requiredPermission}' requise pour ${resource} (${action}).`,
        "MISSING_RESOURCE_PERMISSION",
        403,
      );
    }
  }

  if (minRoleLevel != null) {
    if (!isMinRoleLevelSatisfied(context.user.level, minRoleLevel)) {
      throw new AuthorizationError(
        `Niveau insuffisant pour ${resource} (${action}). Requis <= ${minRoleLevel}, actuel: ${context.user.level}.`,
        "INSUFFICIENT_RESOURCE_LEVEL",
        403,
      );
    }
  }

  if (restriction) {
    const value = context.restrictions.get(restriction);
    const enabled = value === "ON" || value === true;
    if (!enabled) {
      throw new AuthorizationError(
        `Restriction '${restriction}' requise pour ${resource} (${action}).`,
        "RESOURCE_RESTRICTION_DISABLED",
        403,
      );
    }
  }

  if (ownership?.ownershipUserId) {
    if (ownership.ownershipUserId !== context.user.id) {
      throw new AuthorizationError(
        `Accès refusé: ownership mismatch pour ${resource} (${action}).`,
        "OWNERSHIP_MISMATCH",
        403,
      );
    }
  }
}

