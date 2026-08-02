// lib/auth/rbac-shared.ts
// ============================================
// RBAC SHARED — Utilitaires purs (client + server)
// ============================================
// Sous-ensemble PUR de rbac.ts : pas d'import server-only.
// Utilisé par les Client Components (navbar, profile) et
// réexporté depuis rbac.ts côté serveur.

import {
  Crown,
  Shield,
  UserCog,
  UserCheck,
  Store,
  User,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

// ─── Types ──────────────────────────────────

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  EDITOR: "EDITOR",
  SUPERVISOR: "SUPERVISOR",
  USER: "USER",
  GUEST: "GUEST",
} as const;

export const LEVELS = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
  LEVEL_6: 6,
  LEVEL_7: 7,
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
export type Level = typeof LEVELS[keyof typeof LEVELS];

// ─── Type utilisateur unifié (client + server) ───────

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  level: number;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Niveau par rôle ────────────────────────

export const ROLE_TO_LEVEL: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: LEVELS.LEVEL_1,
  [ROLES.ADMIN]: LEVELS.LEVEL_2,
  [ROLES.MANAGER]: LEVELS.LEVEL_3,
  [ROLES.EDITOR]: LEVELS.LEVEL_4,
  [ROLES.SUPERVISOR]: LEVELS.LEVEL_5,
  [ROLES.USER]: LEVELS.LEVEL_6,
  [ROLES.GUEST]: LEVELS.LEVEL_7,
};

// ─── Configuration visuelle par niveau ──────

export interface RoleLevelConfigEntry {
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  /** Tailwind CSS background color class for badge */
  bgClass: string;
  /** Tailwind CSS text color class for badge */
  textClass: string;
  /** Tailwind CSS border color class for badge */
  borderClass: string;
}

export const roleDefinitions = [
  { level: 1, name: "SUPER_ADMIN", description: "Contrôle absolu" },
  { level: 2, name: "ADMIN", description: "Administration générale" },
  { level: 3, name: "MANAGER", description: "Gestion équipes et opérations" },
  { level: 4, name: "EDITOR", description: "Gestion contenu et produits" },
  { level: 5, name: "SUPERVISOR", description: "Supervision commandes" },
  { level: 6, name: "USER", description: "Acheteur privilégié" },
  { level: 7, name: "GUEST", description: "Visiteur non authentifié" },
];

export const RoleLevelConfig: Record<number, RoleLevelConfigEntry> = {
  1: {
    label: "Super Admin",
    icon: Crown,
    color: "#dc2626",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    borderClass: "border-red-200",
  },
  2: {
    label: "Admin",
    icon: Shield,
    color: "#ea580c",
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
  },
  3: {
    label: "Manager",
    icon: UserCog,
    color: "#ca8a04",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-200",
  },
  4: {
    label: "Éditeur",
    icon: UserCheck,
    color: "#16a34a",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    borderClass: "border-green-200",
  },
  5: {
    label: "Superviseur",
    icon: Store,
    color: "#2563eb",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
  },
  6: {
    label: "Utilisateur",
    icon: User,
    color: "#6b7280",
    bgClass: "bg-slate-100",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
  7: {
    label: "Invité",
    icon: Users,
    color: "#9ca3af",
    bgClass: "bg-gray-100",
    textClass: "text-gray-500",
    borderClass: "border-gray-200",
  },
};

// ─── Permissions & Restrictions (purs, sans serveur) ──

export type ToggleState = "ON" | "OFF";

export const PERMISSIONS = {
  "users:read": "users:read",
  "users:create": "users:create",
  "users:update": "users:update",
  "users:delete": "users:delete",
  "users:block": "users:block",
  "users:unban": "users:unban",
  "users:impersonate": "users:impersonate",
  "users:view:any": "users:view:any",
  "users:search": "users:search",
  "users:filter:active": "users:filter:active",
  "users:filter:blocked": "users:filter:blocked",
  "users:filter:inactive": "users:filter:inactive",

  "role:view": "role:view",
  "role:create": "role:create",
  "role:edit": "role:edit",
  "role:delete": "role:delete",
  "role:assign": "role:assign",
  "permission:override": "permission:override",
  "permission:grant:any": "permission:grant:any",
  "permission:revoke:own": "permission:revoke:own",
  "permission:revoke:any": "permission:revoke:any",
  "permission:view:own": "permission:view:own",
  "permission:view:any": "permission:view:any",
  "permission:view:assigned": "permission:view:assigned",
  "product:read": "product:read",
  "product:create": "product:create",
  "product:edit:own": "product:edit:own",
  "product:edit:any": "product:edit:any",
  "product:delete:own": "product:delete:own",
  "product:delete:any": "product:delete:any",
  "product:moderate": "product:moderate",
  "products:read": "products:read",
  "products:create": "products:create",
  "products:update": "products:update",
  "products:delete": "products:delete",
  "products:bulk-edit": "products:bulk-edit",
  "products:import": "products:import",
  "products:export": "products:export",
  "products:view:own": "products:view:own",
  "products:view:any": "products:view:any",
  "products:view:admin": "products:view:admin",

  "order:read:own": "order:read:own",
  "order:read:any": "order:read:any",
  "order:create": "order:create",
  "order:cancel:own": "order:cancel:own",
  "order:cancel:any": "order:cancel:any",
  "order:refund": "order:refund",
  "order:status:update": "order:status:update",
  "orders:read": "orders:read",
  "orders:create": "orders:create",
  "orders:update": "orders:update",
  "orders:delete": "orders:delete",
  "orders:refund": "orders:refund",
  "orders:cancel": "orders:cancel",

  "categories:read": "categories:read",
  "categories:create": "categories:create",
  "categories:update": "categories:update",
  "categories:delete": "categories:delete",

  "analytics:read": "analytics:read",
  "analytics:export": "analytics:export",
  "analytics:dashboard:view": "analytics:dashboard:view",
  "analytics:dashboard:export": "analytics:dashboard:export",
  "analytics:dashboard:filter": "analytics:dashboard:filter",

  "reports:generate": "reports:generate",
  "reports:schedule": "reports:schedule",
  "reports:export": "reports:export",
  "reports:view": "reports:view",

  "settings:read": "settings:read",
  "settings:update": "settings:update",
  "settings:billing": "settings:billing",
  "settings:roles-manage": "settings:roles-manage",

  "media:upload": "media:upload",
  "media:delete": "media:delete",
  "media:read": "media:read",
  "media:manage": "media:manage",

  "system:logs": "system:logs",
  "system:maintenance": "system:maintenance",
  "system:backup": "system:backup",
  "system:config": "system:config",
  "system:cache:clear": "system:cache:clear",
  "system:restart": "system:restart",
  "system:theme:switch": "system:theme:switch",
  "system:theme:manage": "system:theme:manage",
  "system:feature-flags:read": "system:feature-flags:read",
  "system:feature-flags:update": "system:feature-flags:update",
  "system:api-keys:create": "system:api-keys:create",
  "system:api-keys:delete": "system:api-keys:delete",
  "system:api-keys:read": "system:api-keys:read",
  "system:api-keys:rotate": "system:api-keys:rotate",
  "system:api-keys:revoke": "system:api-keys:revoke",
  "system:settings:read": "system:settings:read",
  "system:settings:write": "system:settings:write",

  "content:read": "content:read",
  "content:create": "content:create",
  "content:update": "content:update",
  "content:delete": "content:delete",
  "content:publish": "content:publish",
  "content:moderate": "content:moderate",

  "finance:read:own": "finance:read:own",
  "finance:read:any": "finance:read:any",
  "finance:withdraw": "finance:withdraw",
  "finance:config": "finance:config",

  "audit:switch-self": "audit:switch-self",
  "audit:switch-others": "audit:switch-others",
  "audit:approve-request": "audit:approve-request",
  "audit:view-logs": "audit:view-logs",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type Permission = PermissionCode;

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
  REQUIRES_AUDIT_APPROVAL: "requires_audit_approval",
  AUDIT_MAX_DURATION_MINUTES: "audit_max_duration_minutes",
  AUDIT_ALLOWED_TARGET_LEVELS: "audit_allowed_target_levels",
} as const;

export type Restriction = (typeof RESTRICTIONS)[keyof typeof RESTRICTIONS];

// ─── Niveau vers Rôle (inverse de ROLE_TO_LEVEL) ──

export const LEVEL_TO_ROLE: Record<number, Role> = {
  1: ROLES.SUPER_ADMIN,
  2: ROLES.ADMIN,
  3: ROLES.MANAGER,
  4: ROLES.EDITOR,
  5: ROLES.SUPERVISOR,
  6: ROLES.USER,
  7: ROLES.GUEST,
};

// ─── Helpers de configuration ────────────────

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

// ─── Configurations par défaut des rôles ─────

export const DEFAULT_ROLE_CONFIG: Record<
  Role,
  {
    level: number;
    permissions: Record<Permission, ToggleState>;
    restrictions: Record<Restriction, string | ToggleState>;
  }
> = {
  [ROLES.SUPER_ADMIN]: {
    level: 1,
    permissions: createPermissions({}, "ON"),
    restrictions: createRestrictions({}, "OFF"),
  },
  [ROLES.ADMIN]: {
    level: 2,
    permissions: createPermissions(
      {
        [PERMISSIONS["system:maintenance"]]: "OFF",
        [PERMISSIONS["system:backup"]]: "OFF",
        [PERMISSIONS["users:impersonate"]]: "OFF",
        [PERMISSIONS["audit:switch-self"]]: "ON",
        [PERMISSIONS["audit:switch-others"]]: "OFF",
        [PERMISSIONS["audit:approve-request"]]: "OFF",
        [PERMISSIONS["audit:view-logs"]]: "ON",
      },
      "ON",
    ),
    restrictions: createRestrictions(
      {
        [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
        [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "30",
        [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "3,4,5,6,7",
        [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: "ON",
      },
      "OFF",
    ),
  },
  [ROLES.MANAGER]: {
    level: 3,
    permissions: createPermissions({
      [PERMISSIONS["users:read"]]: "ON",
      [PERMISSIONS["users:update"]]: "ON",
      [PERMISSIONS["users:block"]]: "ON",
      [PERMISSIONS["products:read"]]: "ON",
      [PERMISSIONS["products:create"]]: "ON",
      [PERMISSIONS["products:update"]]: "ON",
      [PERMISSIONS["products:bulk-edit"]]: "ON",
      [PERMISSIONS["products:import"]]: "ON",
      [PERMISSIONS["orders:read"]]: "ON",
      [PERMISSIONS["orders:update"]]: "ON",
      [PERMISSIONS["orders:refund"]]: "ON",
      [PERMISSIONS["orders:cancel"]]: "ON",
      [PERMISSIONS["categories:read"]]: "ON",
      [PERMISSIONS["categories:create"]]: "ON",
      [PERMISSIONS["categories:update"]]: "ON",
      [PERMISSIONS["analytics:read"]]: "ON",
      [PERMISSIONS["analytics:export"]]: "ON",
      [PERMISSIONS["reports:generate"]]: "ON",
      [PERMISSIONS["settings:read"]]: "ON",
      [PERMISSIONS["media:upload"]]: "ON",
      [PERMISSIONS["media:delete"]]: "ON",
      [PERMISSIONS["media:read"]]: "ON",
      [PERMISSIONS["system:logs"]]: "ON",
      [PERMISSIONS["content:read"]]: "ON",
      [PERMISSIONS["content:create"]]: "ON",
      [PERMISSIONS["content:update"]]: "ON",
      [PERMISSIONS["content:publish"]]: "ON",
      [PERMISSIONS["content:moderate"]]: "ON",
      [PERMISSIONS["audit:switch-self"]]: "ON",
      [PERMISSIONS["audit:switch-others"]]: "OFF",
      [PERMISSIONS["audit:approve-request"]]: "OFF",
      [PERMISSIONS["audit:view-logs"]]: "OFF",
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
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "20",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "4,5,6,7",
    }),
  },
  [ROLES.EDITOR]: {
    level: 4,
    permissions: createPermissions({
      [PERMISSIONS["products:read"]]: "ON",
      [PERMISSIONS["products:update"]]: "ON",
      [PERMISSIONS["categories:read"]]: "ON",
      [PERMISSIONS["analytics:read"]]: "ON",
      [PERMISSIONS["media:upload"]]: "ON",
      [PERMISSIONS["media:read"]]: "ON",
      [PERMISSIONS["content:read"]]: "ON",
      [PERMISSIONS["content:create"]]: "ON",
      [PERMISSIONS["content:update"]]: "ON",
      [PERMISSIONS["content:publish"]]: "ON",
      [PERMISSIONS["audit:switch-self"]]: "ON",
      [PERMISSIONS["audit:switch-others"]]: "OFF",
      [PERMISSIONS["audit:approve-request"]]: "OFF",
      [PERMISSIONS["audit:view-logs"]]: "OFF",
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
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "15",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "5,6,7",
    }),
  },
  [ROLES.SUPERVISOR]: {
    level: 5,
    permissions: createPermissions({
      [PERMISSIONS["orders:read"]]: "ON",
      [PERMISSIONS["orders:update"]]: "ON",
      [PERMISSIONS["orders:cancel"]]: "ON",
      [PERMISSIONS["products:read"]]: "ON",
      [PERMISSIONS["analytics:read"]]: "ON",
      [PERMISSIONS["reports:generate"]]: "ON",
      [PERMISSIONS["media:read"]]: "ON",
      [PERMISSIONS["content:read"]]: "ON",
      [PERMISSIONS["content:moderate"]]: "ON",
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
    level: 6,
    permissions: createPermissions({
      [PERMISSIONS["products:read"]]: "ON",
      [PERMISSIONS["orders:read"]]: "ON",
      [PERMISSIONS["orders:create"]]: "ON",
      [PERMISSIONS["categories:read"]]: "ON",
      [PERMISSIONS["media:read"]]: "ON",
      [PERMISSIONS["content:read"]]: "ON",
      [PERMISSIONS["settings:read"]]: "ON",
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
  [ROLES.GUEST]: {
    level: 7,
    permissions: createPermissions({
      [PERMISSIONS["products:read"]]: "ON",
      [PERMISSIONS["categories:read"]]: "ON",
      [PERMISSIONS["content:read"]]: "ON",
      [PERMISSIONS["media:read"]]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "0",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "0",
      [RESTRICTIONS.MAX_STORAGE_MB]: "0",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "0",
      [RESTRICTIONS.CAN_ACCESS_API]: "OFF",
      [RESTRICTIONS.CAN_ACCESS_WEBHOOKS]: "OFF",
      [RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS]: "OFF",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "OFF",
      [RESTRICTIONS.CAN_USE_BULK_ACTIONS]: "OFF",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "10",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "1",
    }),
  },
};

// ─── Utilitaires purs ───────────────────────

/**
 * Normalise un rôle brut (any case) vers un Role valide.
 * Retourne ROLES.GUEST si le rôle est inconnu ou absent.
 */
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.GUEST;
  const normalized = role.toUpperCase().trim();
  return (Object.values(ROLES) as string[]).includes(normalized)
    ? (normalized as Role)
    : ROLES.GUEST;
}

/**
 * Retourne le niveau numérique d'un rôle (1 = plus élevé).
 * Fallback GUEST (7) si le rôle est inconnu.
 */
export function getRoleLevel(role: Role): number {
  return ROLE_TO_LEVEL[role] ?? LEVELS.LEVEL_7;
}

/**
 * Vrai si roleA est au même niveau ou au-dessus de roleB.
 */
export function isRoleAboveOrEqual(roleA: Role, roleB: Role): boolean {
  return getRoleLevel(roleA) <= getRoleLevel(roleB);
}

/**
 * Vrai si le rôle a accès au dashboard admin (ADMIN ou SUPER_ADMIN).
 */
export function isAdminOrSuperAdmin(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

/**
 * Vrai si le rôle a accès au dashboard staff (MANAGER et au-dessus).
 */
export function isStaffOrAbove(role: Role): boolean {
  return getRoleLevel(role) <= getRoleLevel(ROLES.MANAGER);
}

/**
 * Retourne la config visuelle (label, icon, colors) pour un rôle.
 */
export function getRoleConfig(role: Role): RoleLevelConfigEntry {
  const level = getRoleLevel(role);
  return RoleLevelConfig[level] ?? RoleLevelConfig[7];
}
