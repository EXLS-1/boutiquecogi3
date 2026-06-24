/**
 * =============================================================================
 * CATEGORY TYPES — Boutiquecogi3
 * =============================================================================
 * Définitions strictes pour l'ensemble du système de catégories.
 * Atomicité : chaque type a une responsabilité unique.
 * 
 * Aligné avec le système RBAC Level 1-7 (GUEST = Level 7).
 */

import { z } from "zod";

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: NIVEAUX DE PRIVILÈGE RBAC (alignés lib/auth/rbac.ts)
// ═════════════════════════════════════════════════════════════════════════════

export const RBAC_LEVELS = {
  SUPER_ADMIN: 1,   // LEVEL 1
  ADMIN: 2,         // LEVEL 2
  MANAGER: 3,       // LEVEL 3
  EDITOR: 4,        // LEVEL 4
  SUPERVISOR: 5,    // LEVEL 5
  USER: 6,          // LEVEL 6
  GUEST: 7,         // LEVEL 7 — Sessions libres (non authentifiées)
} as const;

export type RbacLevel = typeof RBAC_LEVELS[keyof typeof RBAC_LEVELS];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: TYPES DE CATÉGORIES
// ═════════════════════════════════════════════════════════════════════════════

export const CATEGORY_TYPES = {
  STATIC: "static",           // Catégories fixes (femme, homme, enfant...)
  DYNAMIC: "dynamic",         // Catégories générées dynamiquement
  PROMOTIONAL: "promotional", // Promotions
  NEW_ARRIVAL: "new_arrival", // Nouveautés
  SEASONAL: "seasonal",       // Saisons (optionnel futur)
} as const;

export type CategoryType = typeof CATEGORY_TYPES[keyof typeof CATEGORY_TYPES];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: INTERFACE CORE CATEGORY
// ═════════════════════════════════════════════════════════════════════════════

export interface CategoryDefinition {
  readonly id: string;                    // UUID v7 recommandé
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly href: string;
  readonly type: CategoryType;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly minRbacLevel: RbacLevel;       // Niveau minimum pour voir la catégorie
  readonly requiresAuth: boolean;         // Nécessite une session authentifiée
  readonly metadata?: Record<string, unknown>;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: PROPS DU CATEGORY CARD
// ═════════════════════════════════════════════════════════════════════════════

export interface CategoryCardProps {
  readonly title: string;
  readonly subtitle: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly href: string;
  readonly badge?: string;                // Badge optionnel (Nouveau, -20%, etc.)
  readonly badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  readonly priority?: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: CONFIGURATION DU GRID
// ═════════════════════════════════════════════════════════════════════════════

export interface CategoryGridConfig {
  readonly columns: {
    readonly mobile: number;
    readonly tablet: number;
    readonly desktop: number;
  };
  readonly gap: string;
  readonly maxItems?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: ZOD SCHEMA (validation runtime)
// ═════════════════════════════════════════════════════════════════════════════

export const categoryDefinitionSchema = z.object({
  id: z.string().uuid(),  // UUID v7 exigé
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(100),
  subtitle: z.string().min(1).max(200),
  imageSrc: z.string().min(1),
  imageAlt: z.string().min(1),
  href: z.string().startsWith("/"),
  type: z.enum(["static", "dynamic", "promotional", "new_arrival", "seasonal"]),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
  minRbacLevel: z.number().int().min(1).max(7),
  requiresAuth: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
});

export type CategoryDefinitionValidated = z.infer<typeof categoryDefinitionSchema>;