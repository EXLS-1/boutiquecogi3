/**
 * =============================================================================
 * TYPES PARTAGÉS DES PAGES CATALOGUE
 * =============================================================================
 * Types communs utilisés par les pages catalogue (index + catégorie).
 * Centralisation pour éviter la duplication et garantir la cohérence.
 */

import type { RbacLevel } from "@/lib/category/catalog-types";
import type { CatalogProduct } from "@/lib/catalog/catalog-types";

// ─── RBAC ───────────────────────────────────────────────────────────────────

export interface RbacContext {
  readonly level: RbacLevel;
  readonly isAuthenticated: boolean;
}

// ─── Erreurs ────────────────────────────────────────────────────────────────

export interface PartialError {
  readonly source: string;
  readonly message: string;
}

// ─── Catégorie ──────────────────────────────────────────────────────────────

export interface CatalogCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string | null;
}

export interface CategoryInfo extends CatalogCategory {
  readonly description: string | null;
}

// ─── Données Page Index ─────────────────────────────────────────────────────

export interface CatalogIndexData {
  readonly recentProducts: readonly CatalogProduct[];
  readonly featuredProducts: readonly CatalogProduct[];
  readonly categories: readonly CatalogCategory[];
  readonly fetchError: Error | null;
  readonly partialErrors: readonly PartialError[];
}

// ─── Données Page Catégorie ─────────────────────────────────────────────────

export interface CatalogCategoryData {
  readonly products: readonly CatalogProduct[];
  readonly category: CategoryInfo | null;
  readonly totalCount: number;
  readonly fetchError: Error | null;
  readonly partialErrors: readonly PartialError[];
}

// ─── Props de page catégorie ────────────────────────────────────────────────

export interface CategoryPageProps {
  readonly params: Promise<{ readonly catalog: string }>;
  readonly searchParams?: Promise<{
    readonly page?: string;
    readonly sort?: string;
    readonly filter?: string;
  }>;
}

// ─── Options de tri ─────────────────────────────────────────────────────────

export const VALID_SORT_OPTIONS = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "promoted",
] as const;

export type SortOption = (typeof VALID_SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Nouveautés",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  "name-asc": "Nom A-Z",
  "name-desc": "Nom Z-A",
  promoted: "En vedette",
};
