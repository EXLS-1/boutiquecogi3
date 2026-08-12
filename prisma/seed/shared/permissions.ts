// prisma/seed/shared/permissions.ts
// ============================================
// MATRICE DES PERMISSIONS FINES RBAC
// ============================================
// Ré-exporte les permissions applicatives depuis @/lib/auth/rbac pour
// rester la source unique de vérité. Fournit aussi une description
// structurée pour injection dans la table `Permission`.

import { PERMISSIONS, PERMISSION_META } from "@/lib/auth/rbac";

export interface PermissionSeed {
  code: string;
  name: string;
  description: string;
  category: string;
  isDangerous: boolean;
}

/**
 * Construit la liste exhaustive des permissions à injecter en base
 * (modèle `Permission`). Source de vérité : PERMISSIONS + PERMISSION_META.
 */
export function buildPermissionSeeds(): PermissionSeed[] {
  const seeds: PermissionSeed[] = [];
  for (const code of Object.values(PERMISSIONS)) {
    const meta = PERMISSION_META[code];
    seeds.push({
      code,
      name: meta?.description || code,
      description: meta?.description || "",
      category: meta?.category || "UNKNOWN",
      isDangerous: meta?.isDangerous ?? false,
    });
  }
  return seeds;
}

export { PERMISSIONS };

/** Catégories de permissions (pour regroupement UI). */
export const PERMISSION_CATEGORIES = [
  "USER",
  "ROLE",
  "PRODUCT",
  "ORDER",
  "CATEGORY",
  "ANALYTICS",
  "REPORT",
  "SETTINGS",
  "MEDIA",
  "SYSTEM",
  "CONTENT",
  "FINANCE",
  "AUDIT",
] as const;