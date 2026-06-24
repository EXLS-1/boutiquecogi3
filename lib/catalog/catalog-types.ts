/**
 * =============================================================================
 * CATALOG TYPES - Boutiquecogi3
 * =============================================================================
 * Définitions strictes pour l'ensemble du système catalog.
 * Atomicité : chaque type a une responsabilité unique.
 */

import { z } from "zod";

// ─── RBAC Levels (réutilisés depuis category-types ou redéfinis ici) ───────
export const RBAC_LEVELS = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  MANAGER: 3,
  EDITOR: 4,
  SUPERVISOR: 5,
  USER: 6,
  GUEST: 7,
} as const;

export type RbacLevel = (typeof RBAC_LEVELS)[keyof typeof RBAC_LEVELS];

// ─── Statuts de Produit ─────────────────────────────────────────────────────
export const PRODUCT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
  OUT_OF_STOCK: "out_of_stock",
  DISCONTINUED: "discontinued",
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

// ─── Statuts de Disponibilité ────────────────────────────────────────────────
export const AVAILABILITY_STATUS = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
  PRE_ORDER: "pre_order",
  BACK_ORDER: "back_order",
} as const;

export type AvailabilityStatus =
  (typeof AVAILABILITY_STATUS)[keyof typeof AVAILABILITY_STATUS];

// ─── Interface Core Produit (Domaine) ────────────────────────────────────────
export interface CatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
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
  readonly minRbacLevel: RbacLevel; // Niveau minimum pour voir le produit
  readonly requiresAuth: boolean; // Nécessite authentification
  readonly isPromoted: boolean; // Mis en avant (promotions)
  readonly isNewArrival: boolean; // Nouveauté
  readonly discountPercent: number; // 0 = pas de promo
}

// ─── Interface Produit Brut (Prisma) ────────────────────────────────────────
export interface RawCatalogProduct {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly basePrice: number;
  readonly status: ProductStatus;
  readonly isArchived: boolean;
  readonly isdeleted: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly minRbacLevel?: number;
  readonly requiresAuth?: boolean;
  readonly isPromoted?: boolean;
  readonly isNewArrival?: boolean;
  readonly discountPercent?: number;
  readonly category?: {
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly availabilityProjection?: {
    readonly isAvailable: boolean;
    readonly status?: AvailabilityStatus;
    readonly stockQuantity?: number;
  } | null;
  readonly productImages?: readonly {
    readonly url: string;
    readonly position: number;
  }[];
}

// ─── Paramètres de Requête Catalog ──────────────────────────────────────────
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
  readonly sortBy?: "createdAt" | "price" | "name" | "popularity";
  readonly sortOrder?: "asc" | "desc";
}

// ─── Résultat Paginé ─────────────────────────────────────────────────────────
export interface PaginatedCatalogResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly pageSize: number;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

// ─── Zod Schemas pour validation runtime ────────────────────────────────────
export const productStatusSchema = z.enum([
  "draft",
  "published",
  "archived",
  "out_of_stock",
  "discontinued",
]);

export const availabilityStatusSchema = z.enum([
  "in_stock",
  "low_stock",
  "out_of_stock",
  "pre_order",
  "back_order",
]);

export const catalogProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).nullable(),
  basePrice: z.number().positive().max(100000000),
  image: z.string().min(1),
  basePriceUSD: z.number().positive(),
  basePriceCDF: z.number().positive(),
  isAvailable: z.boolean(),
  availabilityStatus: availabilityStatusSchema,
  categoryName: z.string().nullable(),
  categorySlug: z.string().nullable(),
  status: productStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  minRbacLevel: z.number().int().min(1).max(7),
  requiresAuth: z.boolean(),
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
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  searchQuery: z.string().max(100).optional(),
  sortBy: z.enum(["createdAt", "price", "name", "popularity"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type CatalogProductValidated = z.infer<typeof catalogProductSchema>;
export type CatalogQueryParamsValidated = z.infer<
  typeof catalogQueryParamsSchema
>;
