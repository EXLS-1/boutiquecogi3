// prisma/seed/shared/role-config.ts
// ============================================
// CONFIGURATION DES RÔLES (Level 1 à Level 7)
// ============================================
// Source de vérité partagée pour la table `RoleConfig` et `RoleDefinition`.
// Réutilise DEFAULT_ROLE_CONFIG depuis @/lib/auth/rbac pour rester aligné.

import { Role } from "@prisma/client";
import { DEFAULT_ROLE_CONFIG } from "@/lib/auth/rbac";

export interface RoleConfigSeed {
  role: Role;
  level: number;
  description: string;
  permissions: Record<string, "ON" | "OFF">;
  restrictions: Record<string, string | "ON" | "OFF">;
  isSystem: boolean;
  isActive: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrateur",
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  EDITOR: "Éditeur",
  SUPERVISOR: "Superviseur",
  USER: "Utilisateur",
  GUEST: "Invité",
};

/**
 * Construit la liste des configurations de rôles à injecter.
 * Chaque rôle importe ses permissions/restrictions depuis le module RBAC.
 */
export function buildRoleConfigSeeds(): RoleConfigSeed[] {
  const seeds: RoleConfigSeed[] = [];
  for (const [roleStr, cfg] of Object.entries(DEFAULT_ROLE_CONFIG)) {
    const role = roleStr as Role;
    seeds.push({
      role,
      level: cfg.level,
      description: `Rôle système ${ROLE_LABELS[role] ?? role}`,
      permissions: cfg.permissions as Record<string, "ON" | "OFF">,
      restrictions: cfg.restrictions as Record<string, string | "ON" | "OFF">,
      isSystem: true,
      isActive: true,
    });
  }
  return seeds;
}

export { ROLE_LABELS };