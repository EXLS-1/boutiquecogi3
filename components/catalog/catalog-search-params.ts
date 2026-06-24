/**
 * =============================================================================
 * PRODUCT SEARCH PARAMS (nuqs) — Boutiquecogi3
 * =============================================================================
 * Définitions type-safe des paramètres URL pour le catalog.
 * Partagées entre client et serveur.
 *
 * Correction: Remplace l'import manquant `SORT_OPTIONS` depuis `./product-types`
 * par `SORTABLE_FIELDS` de `catalog-types.ts` (source unique de vérité).
 */

import {
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
  createSearchParamsCache,
  createSerializer,
} from "nuqs/server";
import {
  SORTABLE_FIELDS,
  type SortableField,
} from "@/lib/catalog/catalog-types";

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: OPTIONS DE TRI (source unique depuis catalog-types.ts)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Mapping SortableField → label + valeur URL.
 *
 * Problème corrigé: SORT_OPTIONS était défini dans un fichier `./product-types`
 * inexistant. Désormais, la source de vérité est `SORTABLE_FIELDS` dans
 * `catalog-types.ts`, et ce fichier fournit UNIQUEMENT le mapping UI/URL.
 */
export const SORT_OPTIONS: readonly {
  readonly label: string;
  readonly value: SortableField;
}[] = [
  { label: "Nouveautés", value: "createdAt" },
  { label: "Prix croissant", value: "basePrice" },
  { label: "Nom A-Z", value: "name" },
  { label: "Dernière mise à jour", value: "updatedAt" },
] as const;

// Valeurs littérales pour nuqs (type-safe, non vide)
const sortValues = SORTABLE_FIELDS;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: PARAMÈTRES DE RECHERCHE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Paramètres URL type-safe pour le catalog produit.
 *
 * Règles:
 * - `q`: recherche textuelle
 * - `page`: pagination (1-based)
 * - `category`: slug de catégorie ou "all"
 * - `sort`: champ de tri (validé contre SORTABLE_FIELDS)
 * - `minPrice`/`maxPrice`: fourchette de prix
 */
export const productSearchParams = {
  q: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  category: parseAsString.withDefault("all"),
  sort: parseAsStringLiteral(sortValues).withDefault("createdAt"),
  minPrice: parseAsInteger.withDefault(0),
  maxPrice: parseAsInteger.withDefault(1_000_000_000),
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: CACHE & SERIALIZER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Cache de parsing pour Server Components.
 * Évite de re-parser les search params à chaque render.
 */
export const searchParamsCache = createSearchParamsCache(productSearchParams);

/**
 * Serializer pour construire des URLs avec paramètres.
 *
 * Usage:
 *   const url = serializeProductParams({ sort: "basePrice", page: 2 });
 *   // → "?sort=basePrice&page=2"
 */
export const serializeProductParams = createSerializer(productSearchParams);

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Vérifie si une valeur de tri est valide.
 * Utile pour la validation côté client avant navigation.
 */
export function isValidSort(value: string): value is SortableField {
  return SORTABLE_FIELDS.includes(value as SortableField);
}

/**
 * Retourne le label d'une option de tri.
 */
export function getSortLabel(value: SortableField): string {
  return SORT_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
