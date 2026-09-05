// lib/admin/roles/role.constants.ts
// ============================================================
// Constantes métier : réexport du RBAC + catalogue audit & routes.
// Source de vérité unique : lib/auth/rbac.ts (moteur RBAC existant).
// ============================================================

import {
  ROLES,
  LEVELS,
  ROLE_TO_LEVEL,
  ROLE_HIERARCHY,
  PERMISSIONS,
  RESTRICTIONS,
  DEFAULT_ROLE_CONFIG,
  type Role,
  type Level,
  type Permission,
  type Restriction,
  type ToggleState,
  type PermissionCode,
} from '@/lib/auth/rbac';

export {
  ROLES,
  LEVELS,
  ROLE_TO_LEVEL,
  ROLE_HIERARCHY,
  PERMISSIONS,
  RESTRICTIONS,
  DEFAULT_ROLE_CONFIG,
};
export type { Role, Level, Permission, Restriction, ToggleState, PermissionCode };

/** Les 7 rôles, dans l'ordre hiérarchique (niveau 1 → 7). */
export const ALL_ROLE_NAMES: RoleName[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.EDITOR,
  ROLES.SUPERVISOR,
  ROLES.USER,
  ROLES.GUEST,
] as RoleName[];

/** Actions d'audit tracées par le module Role Audit. */
export const ROLE_AUDIT_ACTIONS = [
  'ROLE_CREATED',
  'ROLE_UPDATED',
  'ROLE_PERMISSION_CHANGED',
  'ROLE_RESTRICTION_CHANGED',
  'ROLE_ASSIGNED',
  'ROLE_REVOKED',
  'ROLE_BLOCKED',
  'ROLE_UNBLOCKED',
  'ROLE_ACTIVATED',
  'ROLE_DEACTIVATED',
  'ROLE_PERMISSIONS_RESET',
  'ROLE_RESTRICTIONS_RESET',
  'PERMISSION_OVERRIDE_UPDATED',
] as const;

export type RoleAuditAction = (typeof ROLE_AUDIT_ACTIONS)[number];

/** Permissions obligatoires par niveau (garde-fou anti-lockout). */
export const MANDATORY_PERMISSIONS_BY_LEVEL: Record<number, PermissionCode[]> = {
  1: ['role:view', 'role:edit', 'audit:view-logs'],
  2: ['role:view', 'audit:view-logs'],
  3: ['role:view'],
  4: [],
  5: [],
  6: [],
  7: [],
};

/** Routes des 4 modules admin. */
export const ROLE_MODULE_ROUTES = {
  roles: '/admin/roles',
  rolePermissions: '/admin/role_permissions',
  roleRestrictions: '/admin/role_restrictions',
  roleAudit: '/admin/role_audit',
} as const;

/** Clés de restrictions booléennes (ON/OFF) vs numériques. */
export const BOOLEAN_RESTRICTIONS: Restriction[] = [
  RESTRICTIONS.CAN_ACCESS_API,
  RESTRICTIONS.CAN_ACCESS_WEBHOOKS,
  RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS,
  RESTRICTIONS.CAN_EXPORT_DATA,
  RESTRICTIONS.CAN_USE_BULK_ACTIONS,
  RESTRICTIONS.REQUIRE_2FA,
  RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE,
  RESTRICTIONS.REQUIRES_AUDIT_APPROVAL,
];

export const NUMERIC_RESTRICTIONS: Restriction[] = [
  RESTRICTIONS.MAX_DAILY_ORDERS,
  RESTRICTIONS.MAX_PRODUCTS_PER_USER,
  RESTRICTIONS.MAX_STORAGE_MB,
  RESTRICTIONS.MAX_TEAM_MEMBERS,
  RESTRICTIONS.RATE_LIMIT_PER_MINUTE,
  RESTRICTIONS.SESSION_DURATION_HOURS,
  RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES,
];
