/**
 * =============================================================================
 * RBAC RESOLVER — Pages Catalogue
 * =============================================================================
 * Résolution du contexte RBAC avec fallback sécurisé.
 * TODO: Intégrer Better-Auth quand l'authentification sera activée.
 */

import { RBAC_LEVELS, type RbacLevel } from "@/lib/category/catalog-types";
import type { RbacContext } from "./catalog-page-types";

export const FALLBACK_RBAC: RbacContext = {
  level: RBAC_LEVELS.GUEST,
  isAuthenticated: false,
} as const;

/**
 * Résout le contexte RBAC courant.
 * En l'absence d'authentification active, retourne toujours GUEST.
 * @returns RbacContext — jamais ne throw
 */
export function resolveRbacContext(): RbacContext {
  try {
    // TODO: Remplacer par l'intégration réelle Better-Auth / middleware
    // const session = await auth(); // Ex: Better-Auth
    // const userRbacLevel = session?.user?.rbacLevel ?? RBAC_LEVELS.GUEST;
    // const isAuthenticated = !!session?.user;
    // return { level: userRbacLevel, isAuthenticated };

    return FALLBACK_RBAC;
  } catch (error) {
    console.error("[RBAC] Erreur résolution, fallback GUEST:", error);
    return FALLBACK_RBAC;
  }
}

/**
 * Vérifie si le niveau RBAC satisfait un minimum requis.
 */
export function hasRbacAccess(
  userLevel: RbacLevel,
  requiredLevel: RbacLevel
): boolean {
  const levelValues = Object.values(RBAC_LEVELS) as string[];
  const userIndex = levelValues.indexOf(userLevel);
  const requiredIndex = levelValues.indexOf(requiredLevel);
  return userIndex >= requiredIndex && userIndex !== -1;
}
