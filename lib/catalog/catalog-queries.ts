/**
 * =============================================================================
 * CATALOG QUERIES - Boutiquecogi3
 * =============================================================================
 * Requêtes Prisma optimisées avec React cache(), tags de revalidation,
 * et support RBAC. Next.js 16 + Prisma 7.8.0
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import {
  CatalogQueryParams,
  CatalogQueryParamsValidated,
  catalogQueryParamsSchema,
  CACHE_TAGS,
  CACHE_DURATIONS,
  HOME_PRODUCTS_LIMIT,
} from "./catalog-types";
import { mapCatalogProduct, mapCatalogProducts } from "./catalog-mappers";

const CATALOG_PAGE_SIZE = 12;

// ─── Base Query Builder (DRY) ───────────────────────────────────────────────

/**
 * Conditions WHERE communes pour tous les produits catalog
 */
function buildBaseWhere(): Prisma.ProductWhereInput {
  return {
    isArchived: false,
    isdeleted: false,
    deletedAt: null,
    status: ProductStatus.ACTIVE,
  } as Prisma.ProductWhereInput;
}

/**
 * Include standard pour les relations catalog
 */
function buildBaseInclude() {
  return {
    category: {
      select: {
        name: true,
        slug: true,
      },
    },
    availabilityProjection: {
      select: {
        isAvailable: true,
        status: true,
        stockQuantity: true,
      },
    },
    productImages: {
      orderBy: { position: "asc" as const },
      take: 1,
      select: {
        url: true,
        position: true,
      },
    },
  } as const;
}

/**
 * Normalize Decimal fields returned by Prisma to plain JS numbers
 * (primarily basePrice) to satisfy RawCatalogProduct typings.
 */
function normalizeBasePrice<T extends { basePrice?: any }>(items: T[] | null) {
  if (!items) return items as any;
  return items.map((p) => ({ ...p, basePrice: Number((p as any).basePrice) }));
}

// ─── Query : Produits Récents (Homepage) ───────────────────────────────────

/**
 * Récupère les produits récents pour la homepage.
 * Cache React pour deduplication intra-requête.
 * Tag : catalog-recent
 */
export const getRecentProducts = cache(
  async (limit: number = HOME_PRODUCTS_LIMIT) => {
    const products = await prisma.product.findMany({
      where: buildBaseWhere(),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(limit, 100),
      include: buildBaseInclude(),
    });

    // Prisma returns Decimal for basePrice; convert to number to match RawCatalogProduct
    const normalized = products.map((p) => ({
      ...p,
      basePrice: Number((p as any).basePrice),
    }));

    return mapCatalogProducts(
      normalized as unknown as readonly RawCatalogProduct[],
    );
  },
);

// ─── Query : Produits par Catégorie ────────────────────────────────────────

/**
 * Récupère les produits filtrés par catégorie.
 */
export const getProductsByCategory = cache(
  async (categorySlug: string, limit: number = CATALOG_PAGE_SIZE) => {
    const products = await prisma.product.findMany({
      where: {
        ...(buildBaseWhere() as any),
        category: {
          slug: categorySlug,
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(limit, 100),
      include: buildBaseInclude(),
    });

    return mapCatalogProducts(products);
  },
);

// ─── Query : Promotions ─────────────────────────────────────────────────────

/**
 * Récupère les produits en promotion (isPromoted = true OU discountPercent > 0).
 * Cache court (3 min) car les promotions changent fréquemment.
 */
export const getPromotionalProducts = cache(
  async (limit: number = CATALOG_PAGE_SIZE) => {
    const products = await prisma.product.findMany({
      where: {
        ...buildBaseWhere(),
        OR: [{ isPromoted: true }, { discountPercent: { gt: 0 } }],
      },
      orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
      take: Math.min(limit, 100),
      include: buildBaseInclude(),
    });

    const normalized = normalizeBasePrice(
      products,
    ) as unknown as readonly RawCatalogProduct[];

    return mapCatalogProducts(normalized);
  },
);

// ─── Query : Nouveautés ─────────────────────────────────────────────────────

/**
 * Récupère les nouveautés (isNewArrival = true OU créés récemment).
 * Cache court (3 min).
 */
export const getNewArrivalProducts = cache(
  async (limit: number = CATALOG_PAGE_SIZE) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const products = await prisma.product.findMany({
      where: {
        ...buildBaseWhere(),
        OR: [{ isNewArrival: true }, { createdAt: { gte: thirtyDaysAgo } }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: Math.min(limit, 100),
      include: buildBaseInclude(),
    });

    const normalized = normalizeBasePrice(
      products,
    ) as unknown as readonly RawCatalogProduct[];

    return mapCatalogProducts(normalized);
  },
);

// ─── Query : Recherche Avancée (Paginée) ───────────────────────────────────

/**
 * Requête paginée avec filtres multiples.
 * Non cacheable car params dynamiques.
 */
export async function searchCatalogProducts(
  params: CatalogQueryParams,
): Promise<{
  products: ReturnType<typeof mapCatalogProducts>;
  totalCount: number;
}> {
  // Validation des paramètres
  const validated = catalogQueryParamsSchema.parse(params);

  const where = {
    ...buildBaseWhere(),
    ...(validated.categorySlug && {
      category: { slug: validated.categorySlug },
    }),
    ...(validated.isAvailable !== undefined && {
      availabilityProjection: { isAvailable: validated.isAvailable },
    }),
    ...(validated.isPromoted !== undefined && {
      isPromoted: validated.isPromoted,
    }),
    ...(validated.isNewArrival !== undefined && {
      isNewArrival: validated.isNewArrival,
    }),
    ...(validated.minPrice !== undefined && {
      basePrice: { gte: validated.minPrice },
    }),
    ...(validated.maxPrice !== undefined && {
      basePrice: { lte: validated.maxPrice },
    }),
    ...(validated.searchQuery && {
      OR: [
        {
          name: {
            contains: validated.searchQuery,
            mode: "insensitive" as const,
          },
        },
        {
          description: {
            contains: validated.searchQuery,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [
        { [validated.sortBy ?? "createdAt"]: validated.sortOrder ?? "desc" },
        { id: "desc" },
      ],
      skip: validated.offset ?? 0,
      take: validated.limit,
      include: buildBaseInclude(),
    }),
    prisma.product.count({ where }),
  ]);

  const normalized = normalizeBasePrice(
    products,
  ) as unknown as readonly RawCatalogProduct[];

  return {
    products: mapCatalogProducts(normalized),
    totalCount,
  };
}

// ─── Query : Détail Produit ─────────────────────────────────────────────────

/**
 * Récupère un produit par son slug.
 * Cache long (10 min) car les détails changent peu.
 */
export const getProductBySlug = cache(async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: {
      slug,
      ...buildBaseWhere(),
    },
    include: {
      ...buildBaseInclude(),
      productImages: {
        orderBy: { position: "asc" },
        select: {
          url: true,
          alt: true,
          position: true,
        },
      },
    },
  });

  if (!product) return null;

  return mapCatalogProduct(product);
});

// ─── Query : Comptage ───────────────────────────────────────────────────────

/**
 * Compte les produits par statut (pour dashboard admin)
 */
export async function getProductCountsByStatus() {
  const [published, archived, outOfStock, total] = await Promise.all([
    prisma.product.count({
      where: { ...buildBaseWhere(), status: "published" },
    }),
    prisma.product.count({ where: { isArchived: true } }),
    prisma.product.count({
      where: {
        ...buildBaseWhere(),
        availabilityProjection: { isAvailable: false },
      },
    }),
    prisma.product.count({ where: { isdeleted: false } }),
  ]);

  return { published, archived, outOfStock, total };
}
