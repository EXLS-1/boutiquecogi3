// lib/auth/rbac.ts
// ============================================
// RBAC SERVER-SIDE — HIERARCHIE STRICTE LEVEL 1-6
// ============================================
// PUREMENT server-side. Aucun 'use client'.
// Importé dans : Server Components, Server Actions, Route Handlers, Proxy.

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // ✅ Singleton — JAMAIS réinstancié

// ───────────────────────────────────────────
// 1. TYPES & CONSTANTS
// ───────────────────────────────────────────

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Level = (typeof LEVELS)[keyof typeof LEVELS];
export type ToggleState = "ON" | "OFF";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EDITOR: "EDITOR",
  SUPERVISOR: "SUPERVISOR",
  USER: "USER",
} as const;

export const LEVELS = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
  LEVEL_6: 6,
} as const;

const ROLE_TO_LEVEL: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: LEVELS.LEVEL_1,
  [ROLES.ADMIN]: LEVELS.LEVEL_2,
  [ROLES.MANAGER]: LEVELS.LEVEL_3,
  [ROLES.EDITOR]: LEVELS.LEVEL_4,
  [ROLES.SUPERVISOR]: LEVELS.LEVEL_5,
  [ROLES.USER]: LEVELS.LEVEL_6,
};

const LEVEL_TO_ROLE: Record<number, Role> = {
  [LEVELS.LEVEL_1]: ROLES.SUPER_ADMIN,
  [LEVELS.LEVEL_2]: ROLES.ADMIN,
  [LEVELS.LEVEL_3]: ROLES.MANAGER,
  [LEVELS.LEVEL_4]: ROLES.EDITOR,
  [LEVELS.LEVEL_5]: ROLES.SUPERVISOR,
  [LEVELS.LEVEL_6]: ROLES.USER,
};

// ───────────────────────────────────────────
// 2. PERMISSIONS EXHAUSTIVES
// ───────────────────────────────────────────

export const PERMISSIONS = {
  USERS_READ: "users:read",
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_BAN: "users:ban",
  USERS_IMPERSONATE: "users:impersonate",
  PRODUCTS_READ: "products:read",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_BULK_EDIT: "products:bulk-edit",
  PRODUCTS_IMPORT: "products:import",
  PRODUCTS_EXPORT: "products:export",
  ORDERS_READ: "orders:read",
  ORDERS_CREATE: "orders:create",
  ORDERS_UPDATE: "orders:update",
  ORDERS_DELETE: "orders:delete",
  ORDERS_REFUND: "orders:refund",
  ORDERS_CANCEL: "orders:cancel",
  CATEGORIES_READ: "categories:read",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_UPDATE: "categories:update",
  CATEGORIES_DELETE: "categories:delete",
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
  REPORTS_GENERATE: "reports:generate",
  REPORTS_SCHEDULE: "reports:schedule",
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_BILLING: "settings:billing",
  SETTINGS_ROLES_MANAGE: "settings:roles-manage",
  MEDIA_UPLOAD: "media:upload",
  MEDIA_DELETE: "media:delete",
  MEDIA_READ: "media:read",
  SYSTEM_LOGS: "system:logs",
  SYSTEM_MAINTENANCE: "system:maintenance",
  SYSTEM_BACKUP: "system:backup",
  CONTENT_READ: "content:read",
  CONTENT_CREATE: "content:create",
  CONTENT_UPDATE: "content:update",
  CONTENT_DELETE: "content:delete",
  CONTENT_PUBLISH: "content:publish",
  CONTENT_MODERATE: "content:moderate",
  // Permissions d'audit (nouvelles)
  AUDIT_SWITCH_SELF: "audit:switch-self",           // Basculer vers un rôle inférieur (soi-même)
  AUDIT_SWITCH_OTHERS: "audit:switch-others",       // Autoriser un autre utilisateur à auditer
  AUDIT_APPROVE_REQUEST: "audit:approve-request",     // Approuver une demande d'audit (SUPER_ADMIN uniquement)
  AUDIT_VIEW_LOGS: "audit:view-logs",               // Consulter les logs d'audit
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ───────────────────────────────────────────
// 3. RESTRICTIONS
// ───────────────────────────────────────────

export const RESTRICTIONS = {
  MAX_DAILY_ORDERS: "max_daily_orders",
  MAX_PRODUCTS_PER_USER: "max_products_per_user",
  MAX_STORAGE_MB: "max_storage_mb",
  MAX_TEAM_MEMBERS: "max_team_members",
  CAN_ACCESS_API: "can_access_api",
  CAN_ACCESS_WEBHOOKS: "can_access_webhooks",
  CAN_ACCESS_ADVANCED_ANALYTICS: "can_access_advanced_analytics",
  CAN_EXPORT_DATA: "can_export_data",
  CAN_USE_BULK_ACTIONS: "can_use_bulk_actions",
  RESTRICTED_TO_OWN_DATA: "restricted_to_own_data",
  RESTRICTED_TO_DEPARTMENT: "restricted_to_department",
  RATE_LIMIT_PER_MINUTE: "rate_limit_per_minute",
  SESSION_DURATION_HOURS: "session_duration_hours",
  REQUIRE_2FA: "require_2fa",
  REQUIRE_APPROVAL_FOR_DELETE: "require_approval_for_delete",
  // Restrictions d'audit (nouvelles)
  REQUIRES_AUDIT_APPROVAL: "requires_audit_approval",           // Nécessite approbation SUPER_ADMIN pour auditer
  AUDIT_MAX_DURATION_MINUTES: "audit_max_duration_minutes",     // Durée max d'une session d'audit
  AUDIT_ALLOWED_TARGET_LEVELS: "audit_allowed_target_levels",   // Levels cibles autorisés (CSV: "4,5,6")
} as const;

export type Restriction = (typeof RESTRICTIONS)[keyof typeof RESTRICTIONS];

// ───────────────────────────────────────────
// 4. CONFIGURATION PAR DEFAUT
// ───────────────────────────────────────────

function createPermissions(
  overrides: Partial<Record<Permission, ToggleState>> = {},
  defaultState: ToggleState = "OFF",
): Record<Permission, ToggleState> {
  const base = Object.fromEntries(
    Object.values(PERMISSIONS).map((p) => [p, defaultState]),
  ) as Record<Permission, ToggleState>;
  return { ...base, ...overrides };
}

function createRestrictions(
  overrides: Partial<Record<Restriction, string | ToggleState>> = {},
  defaultState: string | ToggleState = "OFF",
): Record<Restriction, string | ToggleState> {
  const base = Object.fromEntries(
    Object.values(RESTRICTIONS).map((r) => [r, defaultState]),
  ) as Record<Restriction, string | ToggleState>;
  return { ...base, ...overrides };
}

const DEFAULT_ROLE_CONFIG: Record<
  Role,
  {
    level: Level;
    permissions: Record<Permission, ToggleState>;
    restrictions: Record<Restriction, string | ToggleState>;
  }
> = {
  [ROLES.SUPER_ADMIN]: {
    level: LEVELS.LEVEL_1,
    permissions: createPermissions({}, "ON"),
    restrictions: createRestrictions({}, "OFF"),
  },
  [ROLES.ADMIN]: {
    level: LEVELS.LEVEL_2,
    permissions: createPermissions(
      {
        [PERMISSIONS.SYSTEM_MAINTENANCE]: "OFF",
        [PERMISSIONS.SYSTEM_BACKUP]: "OFF",
        [PERMISSIONS.USERS_IMPERSONATE]: "OFF",
        [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "ON",
      },
      "ON",
    ),
    restrictions: createRestrictions(
      {
        [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",        // ✅ DOIT être approuvé par SUPER_ADMIN
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "30",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "3,4,5,6", // Peut auditer MANAGER et inférieur
      [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: "ON",
      },
      "OFF",
    ),
  },
  [ROLES.MANAGER]: {
    level: LEVELS.LEVEL_3,
    permissions: createPermissions({
      [PERMISSIONS.USERS_READ]: "ON",
      [PERMISSIONS.USERS_UPDATE]: "ON",
      [PERMISSIONS.USERS_BAN]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_CREATE]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.PRODUCTS_BULK_EDIT]: "ON",
      [PERMISSIONS.PRODUCTS_IMPORT]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_REFUND]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.CATEGORIES_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_UPDATE]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_EXPORT]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_DELETE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.SYSTEM_LOGS]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "OFF",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "100",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "500",
      [RESTRICTIONS.MAX_STORAGE_MB]: "2048",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "20",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_ACCESS_WEBHOOKS]: "ON",
      [RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.CAN_USE_BULK_ACTIONS]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "120",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "12",
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",        // ✅ DOIT être approuvé par SUPER_ADMIN
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "20",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "4,5,6", // Peut auditer EDITOR et inférieur
    }),
  },
  [ROLES.EDITOR]: {
    level: LEVELS.LEVEL_4,
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "OFF",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "20",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "100",
      [RESTRICTIONS.MAX_STORAGE_MB]: "512",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "5",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "60",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",        // ✅ DOIT être approuvé par SUPER_ADMIN
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "15",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "5,6",   // Peut auditer SUPERVISOR et USER
    }),
  },
  [ROLES.SUPERVISOR]: {
    level: LEVELS.LEVEL_5,
    permissions: createPermissions({
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "50",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "50",
      [RESTRICTIONS.MAX_STORAGE_MB]: "256",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_DEPARTMENT]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "45",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
    }),
  },
  [ROLES.USER]: {
    level: LEVELS.LEVEL_6,
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "5",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "0",
      [RESTRICTIONS.MAX_STORAGE_MB]: "50",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "1",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "20",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "4",
    }),
  },
};

// ───────────────────────────────────────────
// 5. UTILITAIRES
// ───────────────────────────────────────────

export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.USER;
  const normalized = role.toUpperCase().trim();
  return Object.values(ROLES).includes(normalized as Role)
    ? (normalized as Role)
    : ROLES.USER;
}

export function getRoleLevel(role: Role): number {
  return ROLE_TO_LEVEL[role] ?? LEVELS.LEVEL_6;
}

export function isRoleAboveOrEqual(roleA: Role, roleB: Role): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}

export function canManageRole(managerRole: Role, targetRole: Role): boolean {
  return getRoleLevel(managerRole) < getRoleLevel(targetRole);
}

// ───────────────────────────────────────────
// 6. CACHE PROCESS-LEVEL (survit entre requêtes)
// ───────────────────────────────────────────

const _permissionCache = new Map<Role, Set<Permission>>();
const _restrictionCache = new Map<
  Role,
  Map<Restriction, string | ToggleState>
>();
const _configCache = new Map<Role, ReturnType<typeof mergeConfig>>();

function mergeConfig(
  defaults: (typeof DEFAULT_ROLE_CONFIG)[Role],
  dbConfig: {
    permissions?: unknown;
    restrictions?: unknown;
  },
) {
  return {
    level: defaults.level,
    permissions: {
      ...defaults.permissions,
      ...((dbConfig.permissions as Record<Permission, ToggleState>) ?? {}),
    },
    restrictions: {
      ...defaults.restrictions,
      ...((dbConfig.restrictions as Record<
        Restriction,
        string | ToggleState
      >) ?? {}),
    },
  };
}

async function loadAllRoleConfigs(): Promise<
  Map<Role, ReturnType<typeof mergeConfig>>
> {
  if (_configCache.size > 0) return _configCache;

  try {
    const dbConfigs = await prisma.roleConfig.findMany({
      where: { isActive: true },
      select: { role: true, permissions: true, restrictions: true },
    });

    const dbMap = new Map(dbConfigs.map((c) => [c.role as Role, c]));

    for (const role of Object.values(ROLES)) {
      const dbConfig = dbMap.get(role);
      const defaults = DEFAULT_ROLE_CONFIG[role];
      _configCache.set(
        role,
        dbConfig ? mergeConfig(defaults, dbConfig) : defaults,
      );
    }
  } catch {
    for (const role of Object.values(ROLES)) {
      _configCache.set(role, DEFAULT_ROLE_CONFIG[role]);
    }
  }

  return _configCache;
}

export const getRoleConfig = cache(async (role: Role) => {
  const allConfigs = await loadAllRoleConfigs();
  return allConfigs.get(role) ?? DEFAULT_ROLE_CONFIG[role];
});

// ───────────────────────────────────────────
// 7. RESOLUTION DES PERMISSIONS (O(1) amorti)
// ───────────────────────────────────────────

export async function resolveEffectivePermissions(
  role: Role,
): Promise<Set<Permission>> {
  if (_permissionCache.has(role)) {
    return new Set(_permissionCache.get(role)!);
  }

  const userLevel = getRoleLevel(role);
  const effectivePerms = new Set<Permission>();
  const allConfigs = await loadAllRoleConfigs();

  for (let level = userLevel; level <= LEVELS.LEVEL_6; level++) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = allConfigs.get(levelRole) ?? DEFAULT_ROLE_CONFIG[levelRole];

    for (const [perm, state] of Object.entries(config.permissions)) {
      if (state === "ON") {
        effectivePerms.add(perm as Permission);
      }
    }
  }

  _permissionCache.set(role, new Set(effectivePerms));
  return effectivePerms;
}

export async function resolveEffectiveRestrictions(
  role: Role,
): Promise<Map<Restriction, string | ToggleState>> {
  if (_restrictionCache.has(role)) {
    return new Map(_restrictionCache.get(role)!);
  }

  const userLevel = getRoleLevel(role);
  const effectiveRestr = new Map<Restriction, string | ToggleState>();
  const allConfigs = await loadAllRoleConfigs();

  for (let level = LEVELS.LEVEL_6; level >= userLevel; level--) {
    const levelRole = LEVEL_TO_ROLE[level];
    const config = allConfigs.get(levelRole) ?? DEFAULT_ROLE_CONFIG[levelRole];

    for (const [restr, value] of Object.entries(config.restrictions)) {
      if (!effectiveRestr.has(restr as Restriction)) {
        effectiveRestr.set(restr as Restriction, value);
      }
    }
  }

  _restrictionCache.set(role, new Map(effectiveRestr));
  return effectiveRestr;
}

// ───────────────────────────────────────────
// 8. API PUBLIQUE
// ───────────────────────────────────────────

export async function hasPermission(
  role: Role,
  permission: Permission,
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return effective.has(permission);
}

export async function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return permissions.every((p) => effective.has(p));
}

export async function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): Promise<boolean> {
  const effective = await resolveEffectivePermissions(role);
  return permissions.some((p) => effective.has(p));
}

export async function getRestrictionValue(
  role: Role,
  restriction: Restriction,
): Promise<string | ToggleState> {
  const restrictions = await resolveEffectiveRestrictions(role);
  return restrictions.get(restriction) ?? "OFF";
}

export async function isRestrictionEnabled(
  role: Role,
  restriction: Restriction,
): Promise<boolean> {
  const value = await getRestrictionValue(role, restriction);
  return value === "ON";
}

export async function getNumericRestriction(
  role: Role,
  restriction: Restriction,
): Promise<number> {
  const value = await getRestrictionValue(role, restriction);
  const num = parseInt(value as string, 10);
  return isNaN(num) ? 0 : num;
}

// ───────────────────────────────────────────
// 9. INTEGRATION BETTER-AUTH (Singleton)
// ───────────────────────────────────────────

export async function getCurrentUserRole(): Promise<Role> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) return ROLES.USER;

  const roleStr =
    (session.user as Record<string, unknown>).role ??
    (
      (session.user as Record<string, unknown>).metadata as Record<
        string,
        unknown
      >
    )?.role ??
    ROLES.USER;

  return normalizeRole(roleStr as string);
}

export async function getCurrentUserWithRole() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) return null;

  const roleStr =
    (session.user as Record<string, unknown>).role ??
    (
      (session.user as Record<string, unknown>).metadata as Record<
        string,
        unknown
      >
    )?.role ??
    ROLES.USER;
  const role = normalizeRole(roleStr as string);

  return {
    user: session.user,
    role,
    level: getRoleLevel(role),
    isAuthenticated: true,
  };
}

// ───────────────────────────────────────────
// 10. GUARDS & REDIRECTS
// ───────────────────────────────────────────

export async function requirePermission(
  permission: Permission,
  redirectTo: string = "/unauthorized",
): Promise<Role> {
  const role = await getCurrentUserRole();
  if (!(await hasPermission(role, permission))) redirect(redirectTo);
  return role;
}

export async function requireAllPermissions(
  permissions: Permission[],
  redirectTo: string = "/unauthorized",
): Promise<Role> {
  const role = await getCurrentUserRole();
  if (!(await hasAllPermissions(role, permissions))) redirect(redirectTo);
  return role;
}

export async function requireMinLevel(
  minLevel: number,
  redirectTo: string = "/unauthorized",
  currentRole?: Role,
): Promise<Role> {
  const role = currentRole || (await getCurrentUserRole());
  if (getRoleLevel(role) > minLevel) redirect(redirectTo);
  return role;
}

export async function requireAuth(
  redirectTo: string = "/login",
): Promise<Role> {
  const userData = await getCurrentUserWithRole();
  if (!userData?.isAuthenticated) redirect(redirectTo);
  return userData.role;
}

// ───────────────────────────────────────────
// 11. WRAPPERS SERVER ACTIONS
// ───────────────────────────────────────────

export async function withPermission<T>(
  permission: Permission,
  action: (role: Role) => Promise<T>,
): Promise<T> {
  const role = await getCurrentUserRole();
  if (!(await hasPermission(role, permission))) {
    throw new Error(`Forbidden: requires permission '${permission}'`);
  }
  return action(role);
}

export async function withMinLevel<T>(
  minLevel: number,
  action: (role: Role) => Promise<T>,
): Promise<T> {
  const role = await getCurrentUserRole();
  if (getRoleLevel(role) > minLevel) {
    throw new Error(
      `Forbidden: requires level ${minLevel} or higher (current: ${getRoleLevel(role)})`,
    );
  }
  return action(role);
}

// ───────────────────────────────────────────
// 12. EXPORTS CLIENT
// ───────────────────────────────────────────

export async function getClientPermissions(role: Role): Promise<Permission[]> {
  const effective = await resolveEffectivePermissions(role);
  return Array.from(effective);
}

export async function getClientRestrictions(
  role: Role,
): Promise<Record<Restriction, string | ToggleState>> {
  const restrictions = await resolveEffectiveRestrictions(role);
  return Object.fromEntries(restrictions) as Record<
    Restriction,
    string | ToggleState
  >;
}

// ───────────────────────────────────────────
// 13. HELPERS ADMIN
// ───────────────────────────────────────────

export function isAdminOrSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export async function requireAdminOrSuperAdmin(
  redirectTo: string = "/unauthorized",
): Promise<{ userId: string; role: Role }> {
  const userData = await getCurrentUserWithRole();
  if (!userData?.isAuthenticated || !isAdminOrSuperAdmin(userData.role)) {
    redirect(redirectTo);
  }
  return {
    userId: userData.user.id,
    role: userData.role,
  };
}

export async function getSessionWithUser() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) return null;

  const role = normalizeRole(
    ((session.user as Record<string, unknown>).role ??
      (
        (session.user as Record<string, unknown>).metadata as Record<
          string,
          unknown
        >
      )?.role) as string,
  );

  return {
    session,
    user: session.user,
    userId: session.user.id,
    role,
    level: getRoleLevel(role),
  };
}

// ───────────────────────────────────────────
// 14. INVALIDATION DU CACHE
// ───────────────────────────────────────────

export function invalidateRBACCache(role?: Role): void {
  if (role) {
    _permissionCache.delete(role);
    _restrictionCache.delete(role);
    _configCache.delete(role);
  } else {
    _permissionCache.clear();
    _restrictionCache.clear();
    _configCache.clear();
  }
}
