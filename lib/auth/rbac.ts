// lib/auth/rbac.ts
// ============================================
// RBAC SERVER-SIDE — HIERARCHIE STRICTE LEVEL 1-7
// ============================================
// PUREMENT server-side. Aucun 'use client'.
// Importé dans : Server Components, Server Actions, Route Handlers, Proxy.

import { redirect } from "next/navigation";
import { cache } from "react";
import { PrismaClient, Role as PrismaRole } from "@prisma/client";
import { getCurrentUserFromProvider } from "@/lib/auth/session-provider";
import {
  Crown,
  Shield,
  UserCog,
  UserCheck,
  Store,
  User,
  Users
} from "lucide-react";

// ───────────────────────────────────────────
// 1. TYPES & CONSTANTS & INSTANCE PRISMA
// ───────────────────────────────────────────

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type Level = (typeof LEVELS)[keyof typeof LEVELS];
export type ToggleState = "ON" | "OFF";
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type RoleEvaluationResult = {
  userId: string;
  level: number;
  roleName: Role;
  prismaRole: PrismaRole;
  isBlocked: boolean;
  blockReason?: string;
  blockExpiresAt?: Date | null;
  permissions: PermissionCode[];
  effectivePermissions: Map<PermissionCode, { granted: boolean; source: "role" | "override" | "denied" }>;
  metadata: {
    assignedAt: Date;
    lastVerifiedAt: Date;
    hasOverrides: boolean;
    dangerousPermissions: PermissionCode[];
  };
};

export class RoleEvaluationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "RoleEvaluationError";
  }
}

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

const ROLE_TO_PRISMA: Record<Role, PrismaRole> = {
  [ROLES.SUPER_ADMIN]: PrismaRole.SUPER_ADMIN,
  [ROLES.ADMIN]: PrismaRole.ADMIN,
  [ROLES.MANAGER]: PrismaRole.MANAGER,
  [ROLES.EDITOR]: PrismaRole.EDITOR,
  [ROLES.SUPERVISOR]: PrismaRole.SUPERVISOR,
  [ROLES.USER]: PrismaRole.USER,
  [ROLES.GUEST]: PrismaRole.GUEST,
};

const PRISMA_TO_ROLE: Record<PrismaRole, Role> = {
  [PrismaRole.SUPER_ADMIN]: ROLES.SUPER_ADMIN,
  [PrismaRole.ADMIN]: ROLES.ADMIN,
  [PrismaRole.MANAGER]: ROLES.MANAGER,
  [PrismaRole.EDITOR]: ROLES.EDITOR,
  [PrismaRole.SUPERVISOR]: ROLES.SUPERVISOR,
  [PrismaRole.USER]: ROLES.USER,
  [PrismaRole.GUEST]: ROLES.GUEST,
};

const ROLE_TO_LEVEL: Record<Role, number> = {
  [ROLES.SUPER_ADMIN]: LEVELS.LEVEL_1,
  [ROLES.ADMIN]: LEVELS.LEVEL_2,
  [ROLES.MANAGER]: LEVELS.LEVEL_3,
  [ROLES.EDITOR]: LEVELS.LEVEL_4,
  [ROLES.SUPERVISOR]: LEVELS.LEVEL_5,
  [ROLES.USER]: LEVELS.LEVEL_6,
  [ROLES.GUEST]: LEVELS.LEVEL_7,
};

export const RoleLevel = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  EDITOR: 4,
  SUPERVISOR: 5,
  USER: 6,
  GUEST: 7,
} as const;

/** Numeric role level: 1 (SUPER_ADMIN) → 7 (GUEST) */
export type RoleLevelValue = (typeof RoleLevel)[keyof typeof RoleLevel];

export const RoleLevelConfig: Record<number, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  1: { label: "SUPER_ADMIN", icon: Crown, color: "#dc2626" },
  2: { label: "ADMIN", icon: Shield, color: "#ea580c" },
  3: { label: "MANAGER", icon: UserCog, color: "#ca8a04" },
  4: { label: "EDITOR", icon: UserCheck, color: "#16a34a" },
  5: { label: "SUPERVISOR", icon: Store, color: "#2563eb" },
  6: { label: "USER", icon: User, color: "#6b7280" },
  7: { label: "GUEST", icon: Users, color: "#9ca3af" },
};

export const ROLE_HIERARCHY: Record<number, { name: Role; label: string; description: string }> = {
  1: { name: ROLES.SUPER_ADMIN, label: "Super Admin", description: "Contrôle absolu" },
  2: { name: ROLES.ADMIN, label: "Admin", description: "Administration générale" },
  3: { name: ROLES.MANAGER, label: "Manager", description: "Gestion équipes et opérations" },
  4: { name: ROLES.EDITOR, label: "Éditeur", description: "Gestion contenu et produits" },
  5: { name: ROLES.SUPERVISOR, label: "Superviseur", description: "Supervision commandes" },
  6: { name: ROLES.USER, label: "Utilisateur", description: "Acheteur privilégié" },
  7: { name: ROLES.GUEST, label: "Invité", description: "Visiteur non authentifié" },
};

const LEVEL_TO_ROLE: Record<number, Role> = {
  [LEVELS.LEVEL_1]: ROLES.SUPER_ADMIN,
  [LEVELS.LEVEL_2]: ROLES.ADMIN,
  [LEVELS.LEVEL_3]: ROLES.MANAGER,
  [LEVELS.LEVEL_4]: ROLES.EDITOR,
  [LEVELS.LEVEL_5]: ROLES.SUPERVISOR,
  [LEVELS.LEVEL_6]: ROLES.USER,
  [LEVELS.LEVEL_7]: ROLES.GUEST,
};

// ───────────────────────────────────────────
// 2. PERMISSIONS EXHAUSTIVES
// ───────────────────────────────────────────

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
  "audit:view-logs": "audit:view-logs"
} as const;

export const PERMISSION_META: Record<PermissionCode, { category: string; minLevel: number; isDangerous: boolean; description: string }> = {
  [PERMISSIONS["users:read"]]: { category: "USER", minLevel: 1, isDangerous: false, description: "Lire les utilisateurs" },
  [PERMISSIONS["users:create"]]: { category: "USER", minLevel: 2, isDangerous: false, description: "Créer un utilisateur" },
  [PERMISSIONS["users:update"]]: { category: "USER", minLevel: 2, isDangerous: false, description: "Modifier un utilisateur" },
  [PERMISSIONS["users:delete"]]: { category: "USER", minLevel: 1, isDangerous: true, description: "Supprimer un utilisateur" },
  [PERMISSIONS["users:block"]]: { category: "USER", minLevel: 2, isDangerous: true, description: "Bloquer un utilisateur" },
  [PERMISSIONS["users:unban"]]: { category: "USER", minLevel: 2, isDangerous: false, description: "Débannir un utilisateur" },
  [PERMISSIONS["users:impersonate"]]: { category: "USER", minLevel: 1, isDangerous: true, description: "Usurper un utilisateur" },
  [PERMISSIONS["users:view:any"]]: { category: "USER", minLevel: 2, isDangerous: false, description: "Voir tous les profils" },
  [PERMISSIONS["role:view"]]: { category: "ROLE", minLevel: 2, isDangerous: false, description: "Voir les rôles" },
  [PERMISSIONS["role:create"]]: { category: "ROLE", minLevel: 1, isDangerous: true, description: "Créer un rôle" },
  [PERMISSIONS["role:edit"]]: { category: "ROLE", minLevel: 1, isDangerous: true, description: "Modifier un rôle" },
  [PERMISSIONS["role:delete"]]: { category: "ROLE", minLevel: 1, isDangerous: true, description: "Supprimer un rôle" },
  [PERMISSIONS["role:assign"]]: { category: "ROLE", minLevel: 2, isDangerous: true, description: "Assigner un rôle" },
  [PERMISSIONS["permission:override"]]: { category: "ROLE", minLevel: 1, isDangerous: true, description: "Override permissions" },
  [PERMISSIONS["product:read"]]: { category: "PRODUCT", minLevel: 1, isDangerous: false, description: "Voir les produits" },
  [PERMISSIONS["product:create"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Créer un produit" },
  [PERMISSIONS["product:edit:own"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Modifier ses produits" },
  [PERMISSIONS["product:edit:any"]]: { category: "PRODUCT", minLevel: 5, isDangerous: false, description: "Modifier tous les produits" },
  [PERMISSIONS["product:delete:own"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Supprimer ses produits" },
  [PERMISSIONS["product:delete:any"]]: { category: "PRODUCT", minLevel: 6, isDangerous: true, description: "Supprimer tous les produits" },
  [PERMISSIONS["product:moderate"]]: { category: "PRODUCT", minLevel: 5, isDangerous: false, description: "Modérer les produits" },
  [PERMISSIONS["products:read"]]: { category: "PRODUCT", minLevel: 1, isDangerous: false, description: "Voir les produits" },
  [PERMISSIONS["products:create"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Créer un produit" },
  [PERMISSIONS["products:update"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Modifier un produit" },
  [PERMISSIONS["products:delete"]]: { category: "PRODUCT", minLevel: 6, isDangerous: true, description: "Supprimer un produit" },
  [PERMISSIONS["products:bulk-edit"]]: { category: "PRODUCT", minLevel: 4, isDangerous: false, description: "Édition en masse" },
  [PERMISSIONS["products:import"]]: { category: "PRODUCT", minLevel: 3, isDangerous: false, description: "Importer des produits" },
  [PERMISSIONS["products:export"]]: { category: "PRODUCT", minLevel: 4, isDangerous: false, description: "Exporter des produits" },
  [PERMISSIONS["order:read:own"]]: { category: "ORDER", minLevel: 1, isDangerous: false, description: "Voir ses commandes" },
  [PERMISSIONS["order:read:any"]]: { category: "ORDER", minLevel: 4, isDangerous: false, description: "Voir toutes les commandes" },
  [PERMISSIONS["order:create"]]: { category: "ORDER", minLevel: 1, isDangerous: false, description: "Passer une commande" },
  [PERMISSIONS["order:cancel:own"]]: { category: "ORDER", minLevel: 1, isDangerous: false, description: "Annuler sa commande" },
  [PERMISSIONS["order:cancel:any"]]: { category: "ORDER", minLevel: 4, isDangerous: false, description: "Annuler toute commande" },
  [PERMISSIONS["order:refund"]]: { category: "ORDER", minLevel: 5, isDangerous: true, description: "Effectuer un remboursement" },
  [PERMISSIONS["order:status:update"]]: { category: "ORDER", minLevel: 4, isDangerous: false, description: "Mettre à jour le statut" },
  [PERMISSIONS["orders:read"]]: { category: "ORDER", minLevel: 1, isDangerous: false, description: "Voir les commandes" },
  [PERMISSIONS["orders:create"]]: { category: "ORDER", minLevel: 1, isDangerous: false, description: "Créer une commande" },
  [PERMISSIONS["orders:update"]]: { category: "ORDER", minLevel: 4, isDangerous: false, description: "Modifier une commande" },
  [PERMISSIONS["orders:delete"]]: { category: "ORDER", minLevel: 6, isDangerous: true, description: "Supprimer une commande" },
  [PERMISSIONS["orders:refund"]]: { category: "ORDER", minLevel: 5, isDangerous: true, description: "Rembourser une commande" },
  [PERMISSIONS["orders:cancel"]]: { category: "ORDER", minLevel: 4, isDangerous: false, description: "Annuler une commande" },
  [PERMISSIONS["categories:read"]]: { category: "CATEGORY", minLevel: 1, isDangerous: false, description: "Voir les catégories" },
  [PERMISSIONS["categories:create"]]: { category: "CATEGORY", minLevel: 3, isDangerous: false, description: "Créer une catégorie" },
  [PERMISSIONS["categories:update"]]: { category: "CATEGORY", minLevel: 3, isDangerous: false, description: "Modifier une catégorie" },
  [PERMISSIONS["categories:delete"]]: { category: "CATEGORY", minLevel: 5, isDangerous: true, description: "Supprimer une catégorie" },
  [PERMISSIONS["analytics:read"]]: { category: "ANALYTICS", minLevel: 3, isDangerous: false, description: "Voir les analytics" },
  [PERMISSIONS["analytics:export"]]: { category: "ANALYTICS", minLevel: 5, isDangerous: false, description: "Exporter les analytics" },
  [PERMISSIONS["reports:generate"]]: { category: "REPORT", minLevel: 4, isDangerous: false, description: "Générer des rapports" },
  [PERMISSIONS["reports:schedule"]]: { category: "REPORT", minLevel: 5, isDangerous: false, description: "Planifier des rapports" },
  [PERMISSIONS["settings:read"]]: { category: "SETTINGS", minLevel: 1, isDangerous: false, description: "Voir les paramètres" },
  [PERMISSIONS["settings:update"]]: { category: "SETTINGS", minLevel: 2, isDangerous: false, description: "Modifier les paramètres" },
  [PERMISSIONS["settings:billing"]]: { category: "SETTINGS", minLevel: 2, isDangerous: true, description: "Gérer la facturation" },
  [PERMISSIONS["settings:roles-manage"]]: { category: "SETTINGS", minLevel: 1, isDangerous: true, description: "Gérer les rôles" },
  [PERMISSIONS["media:upload"]]: { category: "MEDIA", minLevel: 3, isDangerous: false, description: "Uploader des médias" },
  [PERMISSIONS["media:delete"]]: { category: "MEDIA", minLevel: 4, isDangerous: false, description: "Supprimer des médias" },
  [PERMISSIONS["media:read"]]: { category: "MEDIA", minLevel: 1, isDangerous: false, description: "Voir les médias" },
  [PERMISSIONS["system:logs"]]: { category: "SYSTEM", minLevel: 2, isDangerous: false, description: "Voir les logs" },
  [PERMISSIONS["system:maintenance"]]: { category: "SYSTEM", minLevel: 1, isDangerous: true, description: "Maintenance système" },
  [PERMISSIONS["system:backup"]]: { category: "SYSTEM", minLevel: 1, isDangerous: true, description: "Gérer les backups" },
  [PERMISSIONS["system:config"]]: { category: "SYSTEM", minLevel: 1, isDangerous: true, description: "Configurer le système" },
  [PERMISSIONS["content:read"]]: { category: "CONTENT", minLevel: 1, isDangerous: false, description: "Voir le contenu" },
  [PERMISSIONS["content:create"]]: { category: "CONTENT", minLevel: 3, isDangerous: false, description: "Créer du contenu" },
  [PERMISSIONS["content:update"]]: { category: "CONTENT", minLevel: 3, isDangerous: false, description: "Modifier du contenu" },
  [PERMISSIONS["content:delete"]]: { category: "CONTENT", minLevel: 5, isDangerous: true, description: "Supprimer du contenu" },
  [PERMISSIONS["content:publish"]]: { category: "CONTENT", minLevel: 3, isDangerous: false, description: "Publier du contenu" },
  [PERMISSIONS["content:moderate"]]: { category: "CONTENT", minLevel: 4, isDangerous: false, description: "Modérer du contenu" },
  [PERMISSIONS["finance:read:own"]]: { category: "FINANCE", minLevel: 1, isDangerous: false, description: "Voir ses transactions" },
  [PERMISSIONS["finance:read:any"]]: { category: "FINANCE", minLevel: 5, isDangerous: false, description: "Voir toutes les transactions" },
  [PERMISSIONS["finance:withdraw"]]: { category: "FINANCE", minLevel: 4, isDangerous: true, description: "Retirer des fonds" },
  [PERMISSIONS["finance:config"]]: { category: "FINANCE", minLevel: 1, isDangerous: true, description: "Configurer les paiements" },
  [PERMISSIONS["audit:switch-self"]]: { category: "AUDIT", minLevel: 2, isDangerous: false, description: "Audit soi-même" },
  [PERMISSIONS["audit:switch-others"]]: { category: "AUDIT", minLevel: 1, isDangerous: true, description: "Audit d'autres" },
  [PERMISSIONS["audit:approve-request"]]: { category: "AUDIT", minLevel: 1, isDangerous: true, description: "Approuver une requête d'audit" },
  [PERMISSIONS["audit:view-logs"]]: { category: "AUDIT", minLevel: 2, isDangerous: false, description: "Voir les logs d'audit" },
  "users:search": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "users:filter:active": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "users:filter:blocked": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "users:filter:inactive": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:grant:any": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:revoke:own": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:revoke:any": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:view:own": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:view:any": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "permission:view:assigned": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "products:view:own": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "products:view:any": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "products:view:admin": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "analytics:dashboard:view": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "analytics:dashboard:export": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "analytics:dashboard:filter": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "reports:export": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "reports:view": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "media:manage": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:cache:clear": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:restart": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:theme:switch": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:theme:manage": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:feature-flags:read": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:feature-flags:update": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:api-keys:create": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:api-keys:delete": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:api-keys:read": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:api-keys:rotate": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:api-keys:revoke": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:settings:read": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  },
  "system:settings:write": {
    category: "",
    minLevel: 0,
    isDangerous: false,
    description: ""
  }
};

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
  // Restrictions d'audit
  REQUIRES_AUDIT_APPROVAL: "requires_audit_approval",
  AUDIT_MAX_DURATION_MINUTES: "audit_max_duration_minutes",
  AUDIT_ALLOWED_TARGET_LEVELS: "audit_allowed_target_levels",
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

export const DEFAULT_ROLE_CONFIG: Record<
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
    level: LEVELS.LEVEL_3,
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
    level: LEVELS.LEVEL_4,
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
    level: LEVELS.LEVEL_5,
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
    level: LEVELS.LEVEL_6,
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
    level: LEVELS.LEVEL_7,
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

// ───────────────────────────────────────────
// 5. UTILITAIRES
// ───────────────────────────────────────────

/**
 * Récupère les permissions par défaut pour un rôle donné.
 */
export function getDefaultPermissions(role: Role): Permission[] {
  const roleConfig = DEFAULT_ROLE_CONFIG[role];
  if (!roleConfig) return [];

  return Object.keys(roleConfig.permissions) as Permission[];
}

/**
 * Récupère les restrictions par défaut pour un rôle donné.
 */
export function getDefaultRestrictions(role: Role): Record<Restriction, string> {
  const roleConfig = DEFAULT_ROLE_CONFIG[role];
  if (!roleConfig) return {
    max_daily_orders: "",
    max_products_per_user: "",
    max_storage_mb: "",
    max_team_members: "",
    can_access_api: "",
    can_access_webhooks: "",
    can_access_advanced_analytics: "",
    can_export_data: "",
    can_use_bulk_actions: "",
    restricted_to_own_data: "",
    restricted_to_department: "",
    rate_limit_per_minute: "",
    session_duration_hours: "",
    require_2fa: "",
    require_approval_for_delete: "",
    requires_audit_approval: "",
    audit_max_duration_minutes: "",
    audit_allowed_target_levels: ""
  };

  return roleConfig.restrictions;
}

export function getRequiredLevelForPermission(permission: PermissionCode): number {
  return PERMISSION_META[permission]?.minLevel ?? 7;
}

export function isDangerousPermission(permission: PermissionCode): boolean {
  return PERMISSION_META[permission]?.isDangerous ?? false;
}

export function getPermissionCategory(permission: PermissionCode): string {
  return PERMISSION_META[permission]?.category ?? "UNKNOWN";
}

export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return ROLES.USER;
  const normalized = role.toUpperCase().trim();
  return Object.values(ROLES).includes(normalized as Role)
    ? (normalized as Role)
    : ROLES.USER;
}

export function getRoleLevel(role: Role): number {
  return ROLE_TO_LEVEL[role] ?? LEVELS.LEVEL_7;
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

  for (let level = userLevel; level <= LEVELS.LEVEL_7; level++) {
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

  for (let level = LEVELS.LEVEL_7; level >= userLevel; level--) {
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
  const userData = await getCurrentUserFromProvider();
  return userData?.role ?? ROLES.GUEST;
}


export async function getCurrentUserWithRole() {
  const userData = await getCurrentUserFromProvider();
  if (!userData) return null;

  // We omit the 'session' part to just return the AuthenticatedUser if needed, 
  // or we can just return userData directly as 'user'.
  const { ...user } = userData;

  return {
    user: user,
    role: userData.role,
    level: userData.level,
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
  const userData = await getCurrentUserFromProvider();
  if (!userData?.session?.user) return null;

  return {
    session: userData.session,
    user: userData.session.user,
    userId: userData.session.user.id,
    role: userData.role,
    level: userData.level,
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

export async function getRoleLevelByUserId(userId: string): Promise<RoleEvaluationResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleAssignment: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user || !user.roleAssignment) return null;

  const assignment = user.roleAssignment;
  const roleName = assignment.role.name as Role;
  
  const effectivePermissions = await resolveEffectivePermissions(roleName);

  return {
    userId,
    level: assignment.role.level,
    roleName,
    prismaRole: ROLE_TO_PRISMA[roleName] || PrismaRole.USER,
    isBlocked: assignment.isBlocked,
    blockReason: assignment.blockedReason || undefined,
    blockExpiresAt: assignment.blockedUntil,
    permissions: Array.from(effectivePermissions),
    effectivePermissions: new Map(Array.from(effectivePermissions).map(p => [p, { granted: true, source: 'role' }])),
    metadata: {
      assignedAt: assignment.assignedAt,
      lastVerifiedAt: new Date(),
      hasOverrides: false,
      dangerousPermissions: Array.from(effectivePermissions).filter(p => isDangerousPermission(p)),
    }
  };
}

export function hasPermissionOnResult(
  result: RoleEvaluationResult,
  permission: PermissionCode,
): boolean {
  return result.permissions.includes(permission);
}

export function hasAllPermissionsOnResult(
  result: RoleEvaluationResult,
  permissions: PermissionCode[],
): boolean {
  return permissions.every((p) => result.permissions.includes(p));
}

export function hasAnyPermissionOnResult(
  result: RoleEvaluationResult,
  permissions: PermissionCode[],
): boolean {
  return permissions.some((p) => result.permissions.includes(p));
}

// ───────────────────────────────────────────
// 15. CONVERSION PRISMA → APPLICATION ROLE
// ───────────────────────────────────────────

/**
 * Convertit un rôle Prisma en rôle applicatif (Role).
 * Si le rôle Prisma n'est pas reconnu, retourne le rôle GUEST par défaut.
 * 
 * @param prismaRole - Le rôle Prisma à convertir
 * @returns Le rôle applicatif correspondant
 * 
 * @example
 * const appRole = convertPrismaRoleToAppRole(PrismaRole.ADMIN);
 * // Retourne: ROLES.ADMIN
 */
export function convertPrismaRoleToAppRole(prismaRole: PrismaRole): Role {
  return PRISMA_TO_ROLE[prismaRole] ?? ROLES.GUEST;
}

/**
 * Convertit un rôle Prisma en niveau numérique.
 * 
 * @param prismaRole - Le rôle Prisma à convertir
 * @returns Le niveau numérique (1-7) ou 7 (GUEST) par défaut
 * 
 * @example
 * const level = getLevelFromPrismaRole(PrismaRole.ADMIN);
 * // Retourne: 2
 */
export function getLevelFromPrismaRole(prismaRole: PrismaRole): number {
  const appRole = PRISMA_TO_ROLE[prismaRole];
  return appRole ? ROLE_TO_LEVEL[appRole] : LEVELS.LEVEL_7;
}

/**
 * Vérifie si un rôle Prisma est supérieur ou égal à un autre.
 * 
 * @param prismaRoleA - Premier rôle Prisma
 * @param prismaRoleB - Deuxième rôle Prisma
 * @returns true si roleA >= roleB dans la hiérarchie
 * 
 * @example
 * const result = isPrismaRoleAboveOrEqual(PrismaRole.ADMIN, PrismaRole.EDITOR);
 * // Retourne: true (ADMIN niveau 2 >= EDITOR niveau 4)
 */
export function isPrismaRoleAboveOrEqual(
  prismaRoleA: PrismaRole,
  prismaRoleB: PrismaRole
): boolean {
  const roleA = PRISMA_TO_ROLE[prismaRoleA];
  const roleB = PRISMA_TO_ROLE[prismaRoleB];
  
  if (!roleA || !roleB) return false;
  
  return ROLE_TO_LEVEL[roleA] <= ROLE_TO_LEVEL[roleB];
}

/**
 * Récupère toutes les informations d'un rôle Prisma.
 * 
 * @param prismaRole - Le rôle Prisma à analyser
 * @returns Un objet contenant le niveau, le nom applicatif et les métadonnées
 * 
 * @example
 * const info = getPrismaRoleInfo(PrismaRole.MANAGER);
 * // Retourne: { level: 3, appRole: "MANAGER", hierarchyInfo: {...} }
 */
export function getPrismaRoleInfo(prismaRole: PrismaRole): {
  level: number;
  appRole: Role;
  label: string;
  description: string;
  color: string;
} {
  const appRole = PRISMA_TO_ROLE[prismaRole];
  
  if (!appRole) {
    return {
      level: LEVELS.LEVEL_7,
      appRole: ROLES.GUEST,
      label: "Invité",
      description: "Rôle non reconnu",
      color: "#9ca3af",
    };
  }

  const level = ROLE_TO_LEVEL[appRole];
  const hierarchyInfo = ROLE_HIERARCHY[level];
  const colorInfo = RoleLevelConfig[level];

  return {
    level,
    appRole,
    label: hierarchyInfo?.label || "Inconnu",
    description: hierarchyInfo?.description || "Rôle non défini",
    color: colorInfo?.color || "#9ca3af",
  };
}

/**
 * Convertit un tableau de rôles Prisma en rôles applicatifs.
 * 
 * @param prismaRoles - Tableau de rôles Prisma
 * @returns Tableau des rôles applicatifs correspondants
 * 
 * @example
 * const appRoles = convertPrismaRolesToAppRoles([PrismaRole.ADMIN, PrismaRole.USER]);
 * // Retourne: ["ADMIN", "USER"]
 */
export function convertPrismaRolesToAppRoles(
  prismaRoles: PrismaRole[]
): Role[] {
  return prismaRoles
    .map((prismaRole) => PRISMA_TO_ROLE[prismaRole])
    .filter((role): role is Role => role !== undefined);
}

/**
 * Vérifie si un rôle Prisma est valide dans le système.
 * 
 * @param prismaRole - Le rôle Prisma à vérifier
 * @returns true si le rôle existe dans la hiérarchie
 * 
 * @example
 * const isValid = isValidPrismaRole(PrismaRole.SUPER_ADMIN);
 * // Retourne: true
 */
export function isValidPrismaRole(prismaRole: PrismaRole): boolean {
  return prismaRole in PRISMA_TO_ROLE;
}

/**
 * Récupère tous les rôles Prisma disponibles dans le système.
 * 
 * @returns Tableau de tous les rôles Prisma valides
 * 
 * @example
 * const allRoles = getAllPrismaRoles();
 * // Retourne: ["SUPER_ADMIN", "ADMIN", ...]
 */
export function getAllPrismaRoles(): PrismaRole[] {
  return Object.keys(PRISMA_TO_ROLE) as PrismaRole[];
}

/**
 * Récupère tous les rôles applicatifs disponibles.
 * 
 * @returns Tableau de tous les rôles applicatifs
 * 
 * @example
 * const allAppRoles = getAllAppRoles();
 * // Retourne: ["SUPER_ADMIN", "ADMIN", ...]
 */
export function getAllAppRoles(): Role[] {
  return Object.values(ROLES);
}

/**
 * Convertit un rôle applicatif en rôle Prisma.
 * Fonction inverse de PRISMA_TO_ROLE.
 * 
 * @param appRole - Le rôle applicatif à convertir
 * @returns Le rôle Prisma correspondant
 * 
 * @example
 * const prismaRole = convertAppRoleToPrismaRole(ROLES.ADMIN);
 * // Retourne: PrismaRole.ADMIN
 */
export function convertAppRoleToPrismaRole(appRole: Role): PrismaRole {
  return ROLE_TO_PRISMA[appRole] ?? PrismaRole.USER;
}