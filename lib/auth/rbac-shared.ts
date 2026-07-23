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
