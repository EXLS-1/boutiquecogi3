/**
 * =============================================================================
 * CATEGORY TYPES — Boutiquecogi3
 * =============================================================================
 * Définitions strictes pour l'ensemble du système de catalog.
 * Atomicité : chaque type a une responsabilité unique.
 * 
 * Aligné avec le système RBAC Level 1-7 (GUEST = Level 7).
 */

import { z } from "zod";
import { RoleLevel } from "@/lib/auth/rbac";

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: NIVEAUX DE PRIVILÈGE RBAC (alignés lib/auth/rbac.ts)
// ═════════════════════════════════════════════════════════════════════════════

export type Role_Level = typeof RoleLevel[keyof typeof RoleLevel];
export type RbacLevel = Role_Level;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: TYPES DE catalog
// ═════════════════════════════════════════════════════════════════════════════

export const CATALOG_TYPES = {
  STATIC: "static",           // catalog fixes (femme, homme, enfant...)
  DYNAMIC: "dynamic",         // catalog générées dynamiquement
  PROMOTIONAL: "promotional", // Promotions
  NEW_ARRIVAL: "new_arrival", // Nouveautés
  SEASONAL: "seasonal",       // Saisons (optionnel futur)
} as const;

export type CatalogType = typeof CATALOG_TYPES[keyof typeof CATALOG_TYPES];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: INTERFACE CORE CATALOG
// ═════════════════════════════════════════════════════════════════════════════

export interface CatalogDefinition {
  readonly id: string;                    // UUID v7 recommandé
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly href: string;
  readonly type: CatalogType;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly minRbacLevel: RbacLevel;       // Niveau minimum pour voir la catégorie
  readonly requiresAuth: boolean;         // Nécessite une session authentifiée
  readonly metadata?: Record<string, unknown>;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: PROPS DU CATALOG CARD
// ═════════════════════════════════════════════════════════════════════════════

export interface CatalogCardProps {
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

export interface CatalogGridConfig {
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
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CategoryDefinitionValidated = z.infer<typeof categoryDefinitionSchema>;