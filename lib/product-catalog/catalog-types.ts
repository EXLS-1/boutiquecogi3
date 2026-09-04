/**
 * =============================================================================
 * CATALOG TYPES — Boutiquecogi3
 * =============================================================================
 * Définitions strictes pour l'ensemble du système catalog.
 * Atomicité : chaque type a une responsabilité unique.
 * 
 * RÈGLES :
 * - AUCUNE constante ne doit être redéfinie ici (voir catalog-constants.ts).
 * - Les enums métier doivent refléter EXACTEMENT le schéma Prisma.
 */

import { z } from "zod";
import { Currency } from "@prisma/client";
import { ProductStatus as PrismaProductStatus } from "@prisma/client";
import {
  STOCK_THRESHOLDS,
  DEFAULT_PRODUCT_RBAC,
} from "./catalog-constants";

// ─── Re-export des constantes nécessaires pour compatibilité ─────────────
// NOTE: Ces re-exports sont DEPRECATED. Préférer l'import direct depuis
// catalog-constants.ts dans tout nouveau code.
export { STOCK_THRESHOLDS, DEFAULT_PRODUCT_RBAC };

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: RBAC LEVELS (alignés avec lib/auth/rbac.ts)
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

export type RbacLevel = (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: STATUTS PRODUIT (alignés avec Prisma ProductStatus)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #7: Les enums métier étaient dupliquées côté Prisma et domaine.
// Désormais, on importe DIRECTEMENT depuis @prisma/client pour garantir
// la synchronisation. Les types domaine sont des alias type-safe.

export type ProductStatus = PrismaProductStatus;

// Valeurs possibles (pour runtime checks)
export const PRODUCT_STATUS_VALUES = [
  "ACTIVE",
  "DRAFT",
  "PENDING",
  "SCHEDULED",
  "PUBLISHED", 
  "ARCHIVED",
  "OUT_OF_STOCK",
  "DISCONTINUED"
] as const satisfies readonly ProductStatus[];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: STATUTS DE DISPONIBILITÉ
// ═════════════════════════════════════════════════════════════════════════════

export const AVAILABILITY_STATUS = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
  PRE_ORDER: "pre_order",
  BACK_ORDER: "back_order"
} as const;

export type AvailabilityStatus =
  (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: PRODUCT ACCESS POLICY TYPES
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #5: RBAC insuffisamment modélisé.

export interface ProductAccessPolicy {
  readonly visibility: "public" | "authenticated" | "restricted" | "private" | "hidden";
  readonly minRbacLevel: RbacLevel;
  readonly requiresAuth: boolean;
  readonly requiredPermissions?: readonly string[];
  readonly excludedRoles?: readonly string[];
  readonly ownerOnly?: boolean;
  readonly restrictions?: readonly string[];
}

export const DEFAULT_ACCESS_POLICY: ProductAccessPolicy = {
  visibility: "public",
  minRbacLevel: RBAC_LEVELS.GUEST,
  requiresAuth: false,
} as const;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5: INTERFACE CORE PRODUIT (Domaine)
// ═════════════════════════════════════════════════════════════════════════════

export interface CatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;

  /**
   * Prix monétaire (héritage UI)
   * NOTE: `components/product-price/price.tsx` attend des montants en cents USD
   * (amount) et une devise explicite (currency).
   *
   * Ces champs sont conservés pour compatibilité avec ProductCard.
   */
  readonly price: number; // amount en cents USD
  readonly currency: Currency;

  // Champs domaine actuels
  readonly basePrice: number;
  readonly image: string;
  readonly basePriceUSD: number;
  readonly basePriceCDF: number;

  readonly isAvailable: boolean;
  readonly availabilityStatus: AvailabilityStatus;
  readonly categoryName: string | null;
  readonly categorySlug: string | null;
  readonly status: ProductStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // RBAC
  readonly accessPolicy: ProductAccessPolicy;

  // Promotions
  readonly isPromoted: boolean;
  readonly isNewArrival: boolean;
  readonly discountPercent: number;
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6: INTERFACE PRODUIT BRUT (Prisma — avec sérialisation)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #6: Le mapper consommait stockQuantity mais la requête
// ne le chargeait pas. Désormais, l'interface explicite TOUT ce que le
// mapper attend, et les requêtes DOIVENT le fournir.

export interface RawCatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly basePrice: number;        // Déjà sérialisé (Decimal → number)
  readonly status: ProductStatus;
  readonly isArchived: boolean;
  readonly isdeleted: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  // RBAC
  readonly minRbacLevel?: number;
  readonly requiresAuth?: boolean;
  // Promotions
  readonly isPromoted?: boolean;
  readonly isNewArrival?: boolean;
  readonly discountPercent?: number;
  // Relations
  readonly category?: {
    readonly name: string;
    readonly slug: string;
  } | null;
  // Problème audit #6: stockQuantity EST REQUIS
  readonly availabilityProjection?: {
    readonly isAvailable: boolean;
    readonly status?: AvailabilityStatus;
  } | null;
  readonly productImages?: readonly {
    readonly url: string;
    readonly position: number;
  }[];
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7: PARAMÈTRES DE REQUÊTE CATALOG
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #9: Tri non garanti. Les champs de tri sont désormais
// strictement typés et validés contre le schéma Prisma.

export const SORTABLE_FIELDS = [
  "createdAt",
  "updatedAt", 
  "name",
  "basePrice",
  // "popularity" — DÉSACTIVÉ: champ non existant dans Prisma
  // Ajouter ici quand le champ est créé côté DB
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export const CATALOG_OPTIONS = [
  "generale",
  "nouveautes",
  "promotions",
] as const;

export type CatalogOption = (typeof CATALOG_OPTIONS)[number];

export interface CatalogQueryParams {
  readonly limit: number;
  readonly offset?: number;
  readonly categorySlug?: string;
  readonly status?: ProductStatus;
  readonly isAvailable?: boolean;
  readonly isPromoted?: boolean;
  readonly isNewArrival?: boolean;
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly searchQuery?: string;
  readonly sortBy?: SortableField;
  readonly sortOrder?: "asc" | "desc";
  readonly catalogOption?: CatalogOption;
}


// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8: RÉSULTAT PAGINÉ
// ═════════════════════════════════════════════════════════════════════════════

export interface PaginatedCatalogResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageSize: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9: ZOD SCHEMAS (validation runtime)
// ═════════════════════════════════════════════════════════════════════════════

export const productStatusSchema = z.enum([
  "ACTIVE",
  "DRAFT",
  "PENDING",
  "SCHEDULED",
  "PUBLISHED",
  "ARCHIVED",
  "OUT_OF_STOCK",
  "DISCONTINUED",
]);

export const availabilityStatusSchema = z.enum([
  "in_stock",
  "low_stock",
  "out_of_stock",
  "pre_order",
  "back_order",
]);

export const productAccessPolicySchema = z.object({
  visibility: z.enum(["public", "authenticated", "restricted", "private", "hidden"]),
  minRbacLevel: z.number().int().min(1).max(7),
  requiresAuth: z.boolean(),
  requiredPermissions: z.array(z.string()).optional(),
  excludedRoles: z.array(z.string()).optional(),
  ownerOnly: z.boolean().optional(),
  restrictions: z.array(z.string()).optional(),
});

export const catalogProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).nullable(),

  // Compat UI: montants attendus par components/product-price/price.tsx
  price: z.number().nonnegative(),
  currency: z.enum(Currency),

  basePrice: z.number().nonnegative().max(100_000_000),
  image: z.string().min(1),
  basePriceUSD: z.number().nonnegative(),
  basePriceCDF: z.number().nonnegative(),
  isAvailable: z.boolean(),
  availabilityStatus: availabilityStatusSchema,
  categoryName: z.string().nullable(),
  categorySlug: z.string().nullable(),
  status: productStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  accessPolicy: productAccessPolicySchema,
  isPromoted: z.boolean(),
  isNewArrival: z.boolean(),
  discountPercent: z.number().int().min(0).max(100),
});


export const catalogQueryParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(12),
  offset: z.number().int().min(0).optional(),
  categorySlug: z.string().optional(),
  status: productStatusSchema.optional(),
  isAvailable: z.boolean().optional(),
  isPromoted: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  catalogOption: z.enum(CATALOG_OPTIONS).optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  searchQuery: z.string().max(100).optional(),
  sortBy: z.enum(SORTABLE_FIELDS).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});



export type CatalogProductValidated = z.infer<typeof catalogProductSchema>;
export type CatalogQueryParamsValidated = z.infer<typeof catalogQueryParamsSchema>;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10: SERIALIZATION HELPERS (Prisma Decimal → number)
// ═════════════════════════════════════════════════════════════════════════════
// 
// Problème audit #6 + recherche Prisma: Prisma retourne Decimal pour les
// champs monétaires. Ces helpers centralisent la conversion.

/**
 * Convertit un Prisma Decimal en number de manière sécurisée.
 * Gère null, undefined, et les valeurs déjà numériques.
 */
export function serializeDecimal(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  // Prisma.Decimal a une méthode toNumber()
  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Normalise un tableau de produits Prisma en convertissant les Decimals.
 * À appeler IMMÉDIATEMENT après chaque requête Prisma.
 */
export function normalizeProducts<T extends { basePrice?: unknown }>(
  items: T[] | null | undefined,
): (T & { basePrice: number })[] {
  if (!items) return [];
  return items.map((item) => ({
    ...item,
    basePrice: serializeDecimal(item.basePrice),
  })) as (T & { basePrice: number })[];
}

/**
 * Normalise un produit unique Prisma.
 */
export function normalizeProduct<T extends { basePrice?: unknown }>(
  item: T | null | undefined,
): (T & { basePrice: number }) | null {
  if (!item) return null;
  return {
    ...item,
    basePrice: serializeDecimal(item.basePrice),
  } as T & { basePrice: number };
}