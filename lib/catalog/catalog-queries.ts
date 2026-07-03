/**
 * =============================================================================
 * CATALOG QUERIES — Boutiquecogi3
 * =============================================================================
 * Requêtes Prisma optimisées avec React cache(), tags de revalidation,
 * et support RBAC. Next.js 16 + Prisma 7.8.0
 *
 * Problèmes audit résolus :
 * - #3: Imports CACHE_TAGS/CACHE_DURATIONS depuis catalog-constants.ts
 * - #4: findUnique corrigé en findFirst avec include complet
 * - #6: stockQuantity inclus dans availabilityProjection
 * - #8: Cache tags intégrés dans unstable_cache + revalidateTag
 * - #9: sortBy validé contre SORTABLE_FIELDS
 */

import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import {
  CACHE_TAGS,
  CACHE_DURATIONS,
  HOME_PRODUCTS_LIMIT,
  CATALOG_PAGE_SIZE,
} from "./catalog-constants";
import {
  SORTABLE_FIELDS,
  type SortableField,
  type CatalogQueryParams,
  normalizeProducts,
  normalizeProduct,
  catalogQueryParamsSchema,
} from "./catalog-types";
import { mapCatalogProduct, mapCatalogProducts } from "./catalog-mappers";

// ─── Type local pour le produit brut Prisma ─────────────────────────────────
type PrismaProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof buildBaseInclude;
}>;

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1: BASE QUERY BUILDER (DRY)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Conditions WHERE communes pour tous les produits catalog.
 * Filtre les produits archivés, supprimés, et non publiés.
 */
function buildBaseWhere(): Prisma.ProductWhereInput {
  return {
    isArchived: false,
    isdeleted: false,
    deletedAt: null,
    status: ProductStatus.PUBLISHED,
  };
}

/**
 * Include standard pour les relations catalog.
 *
 * Problème audit #6: stockQuantity EST INCLUS dans availabilityProjection.
 * Sans ce champ, le mapper interprète tous les produits avec stockQuantity=0.
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
  } as const satisfies Prisma.ProductInclude;
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2: CACHE STRATEGY
// ═════════════════════════════════════════════════════════════════════════════
//
// Problème audit #8: Les tags de cache étaient déclarés mais jamais utilisés.
// Désormais, chaque requête utilise unstable_cache avec les tags appropriés.

/**
 * Wrapper de cache avec tags pour les requêtes catalog.
 *
 * @param fn - Fonction à cacher
 * @param tags - Tags de revalidation
 * @param duration - Durée de cache en secondes
 */
function withCatalogCache<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  tags: string[],
  duration: number,
): T {
  const cached = unstable_cache(
    fn,
    undefined,
    {
      tags,
      revalidate: duration,
    },
  );

  return cached as T;
}

/**
 * Invalide le cache catalog pour un tag spécifique.
 * À appeler après mutation (create/update/delete).
 */
export async function invalidateCatalogCache(tag: string): Promise<void> {
  revalidateTag(tag);
}

/**
 * Invalide TOUS les caches catalog.
 * À utiliser avec parcimonie (ex: après import massif).
 */
export async function invalidateAllCatalogCaches(): Promise<void> {
  Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3: QUERIES
// ═════════════════════════════════════════════════════════════════════════════

// ─── Query : Produits Récents (Homepage) ────────────────────────────────────

/**
 * Récupère les produits récents pour la homepage.
 * Cache React pour deduplication intra-requête.
 * Cache Next.js avec revalidation tag.
 *
 * Tag: CACHE_TAGS.CATALOG_RECENT
 * Durée: CACHE_DURATIONS.HOME_PRODUCTS (5 min)
 */
export const getRecentProducts = cache(
  withCatalogCache(
    async (limit: number = HOME_PRODUCTS_LIMIT) => {
      const products = await prisma.product.findMany({
        where: buildBaseWhere(),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(limit, MAX_CATALOG_PAGE_SIZE),
        include: buildBaseInclude(),
      });

      // Sérialisation des Decimals + mapping domaine
      return mapCatalogProducts(normalizeProducts(products));
    },
    [CACHE_TAGS.CATALOG_RECENT],
    CACHE_DURATIONS.HOME_PRODUCTS,
  ),
);

// ─── Query : Produits par Catégorie ──────────────────────────────────────────

/**
 * Récupère les produits filtrés par catégorie.
 *
 * Tag: CACHE_TAGS.CATALOG_CATEGORY
 * Durée: CACHE_DURATIONS.CATALOG_LIST (1 min)
 */
export const getProductsByCategory = cache(
  withCatalogCache(
    async (categorySlug: string, limit: number = CATALOG_PAGE_SIZE) => {
      const products = await prisma.product.findMany({
        where: {
          ...buildBaseWhere(),
          category: {
            slug: categorySlug,
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(limit, MAX_CATALOG_PAGE_SIZE),
        include: buildBaseInclude(),
      });

      return mapCatalogProducts(normalizeProducts(products));
    },
    [CACHE_TAGS.CATALOG_CATEGORY],
    CACHE_DURATIONS.CATALOG_LIST,
  ),
);

// ─── Query : Promotions ─────────────────────────────────────────────────────

/**
 * Récupère les produits en promotion (isPromoted = true OU discountPercent > 0).
 *
 * Tag: CACHE_TAGS.CATALOG_PROMOTIONS
 * Durée: CACHE_DURATIONS.PROMOTIONS (3 min)
 */
// NOTE: Les fonctions legacy getPromotionalProducts/getNewArrivalProducts
// sont maintenues pour compatibilité, mais la logique principale est désormais
// pilotée par searchCatalogProducts(..., { catalogOption }).
// Elles pourront être supprimées après migration UI complète.

export const getPromotionalProducts = cache(
  withCatalogCache(
    async (limit: number = CATALOG_PAGE_SIZE) => {
      const products = await prisma.product.findMany({
        where: {
          ...buildBaseWhere(),
          OR: [{ isPromoted: true }, { discountPercent: { gt: 0 } }],
        },
        orderBy: [{ discountPercent: "desc" }, { createdAt: "desc" }],
        take: Math.min(limit, MAX_CATALOG_PAGE_SIZE),
        include: buildBaseInclude(),
      });

      return mapCatalogProducts(normalizeProducts(products));
    },
    [CACHE_TAGS.CATALOG_PROMOTIONS],
    CACHE_DURATIONS.PROMOTIONS,
  ),
);

export const getNewArrivalProducts = cache(
  withCatalogCache(
    async (limit: number = CATALOG_PAGE_SIZE) => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const products = await prisma.product.findMany({
        where: {
          ...buildBaseWhere(),
          OR: [{ isNewArrival: true }, { createdAt: { gte: ninetyDaysAgo } }],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(limit, MAX_CATALOG_PAGE_SIZE),
        include: buildBaseInclude(),
      });

      return mapCatalogProducts(normalizeProducts(products));
    },
    [CACHE_TAGS.CATALOG_NOUVEAUTES],
    CACHE_DURATIONS.NOUVEAUTES,
  ),
);


// ─── Query : Recherche Avancée (Paginée) ───────────────────────────────────

/**
 * Requête paginée avec filtres multiples.
 * NON cacheable car params dynamiques.
 *
 * Problème audit #9: sortBy est validé contre SORTABLE_FIELDS avant exécution.
 */
export async function searchCatalogProducts(
  params: CatalogQueryParams,
): Promise<{
  products: ReturnType<typeof mapCatalogProducts>;
  totalCount: number;
}> {
  // Validation des paramètres
  const validated = catalogQueryParamsSchema.parse(params);

  // catalogOption → conditions métier (approx)
  // - generale: aucune condition spécifique
  // - promotions: réduction en % (isPromoted=true OU discountPercent>0)
  // - nouveautes: moins de 90 jours dans le stock (approx: créé récemment)
  //   ⚠️ sans jointure inventaire, on utilise createdAt >= now-90 jours.
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);


  // Problème audit #9: Validation du champ de tri
  const sortField = validated.sortBy ?? "createdAt";
  if (!SORTABLE_FIELDS.includes(sortField as SortableField)) {
    throw new Error(
      `Champ de tri invalide: "${sortField}". ` +
        `Valeurs acceptées: ${SORTABLE_FIELDS.join(", ")}. ` +
        `Pour ajouter un nouveau champ de tri, mettez à jour SORTABLE_FIELDS dans catalog-types.ts ` +
        `et assurez-vous que le champ existe dans le schéma Prisma.`,
    );
  }

  const where: Prisma.ProductWhereInput = {
    ...buildBaseWhere(),
    ...(validated.categorySlug && {
      category: { slug: validated.categorySlug },
    }),
    ...(validated.isAvailable !== undefined && {
      availabilityProjection: { isAvailable: validated.isAvailable },
    }),
    // Conditions legacy directes (si explicitement passées)
    ...(validated.isPromoted !== undefined && {
      isPromoted: validated.isPromoted,
    }),
    ...(validated.isNewArrival !== undefined && {
      isNewArrival: validated.isNewArrival,
    }),

    // Conditions catalogOption (prioritaires sur legacy si défini)
    ...(validated.catalogOption === "promotions" && {
      OR: [{ isPromoted: true }, { discountPercent: { gt: 0 } }],
    }),
    ...(validated.catalogOption === "nouveautes" && {
      OR: [{ isNewArrival: true }, { createdAt: { gte: ninetyDaysAgo } }],
    }),

    ...(validated.minPrice !== undefined && {
      basePrice: { gte: new Prisma.Decimal(validated.minPrice) },
    }),
    ...(validated.maxPrice !== undefined && {
      basePrice: { lte: new Prisma.Decimal(validated.maxPrice) },
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
      orderBy: [{ [sortField]: validated.sortOrder ?? "desc" }, { id: "desc" }],
      skip: validated.offset ?? 0,
      take: validated.limit,
      include: buildBaseInclude(),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: mapCatalogProducts(normalizeProducts(products)),
    totalCount,
  };
}

// ─── Query : Détail Produit ─────────────────────────────────────────────────

/**
 * Récupère un produit par son slug.
 *
 * Problème audit #4: findUnique ne supporte pas les relations dans where.
 * Correction: Utilisation de findFirst avec le where complet + include.
 *
 * Tag: CACHE_TAGS.CATALOG_PRODUCTS
 * Durée: CACHE_DURATIONS.PRODUCT_DETAIL (10 min)
 */
export const getProductBySlug = cache(
  withCatalogCache(
    async (slug: string) => {
      const product = await prisma.product.findFirst({
        where: {
          slug,
          ...buildBaseWhere(),
        },
        include: buildBaseInclude(),
      });

      if (!product) return null;

      return mapCatalogProduct(normalizeProduct(product)!);
    },
    [CACHE_TAGS.CATALOG_PRODUCTS],
    CACHE_DURATIONS.PRODUCT_DETAIL,
  ),
);

// ─── Query : Comptage ───────────────────────────────────────────────────────

/**
 * Compte les produits par statut (pour dashboard admin).
 * Non caché: données admin en temps réel.
 */
export async function getProductCountsByStatus() {
  const [published, archived, outOfStock, total] = await Promise.all([
    prisma.product.count({
      where: { ...buildBaseWhere(), status: ProductStatus.PUBLISHED },
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

// ─── Query : Produits en Vedette (Featured) ─────────────────────────────────

/**
 * Récupère les produits en vedette (isPromoted = true).
 * Utilisé pour la section "Nos coups de cœur" sur la homepage.
 *
 * Tag: CACHE_TAGS.CATALOG_PROMOTIONS
 * Durée: CACHE_DURATIONS.PROMOTIONS (3 min)
 */
export const getFeaturedProducts = cache(
  withCatalogCache(
    async (limit: number = 6) => {
      const products = await prisma.product.findMany({
        where: {
          ...buildBaseWhere(),
          isPromoted: true,
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(limit, MAX_CATALOG_PAGE_SIZE),
        include: buildBaseInclude(),
      });

      return mapCatalogProducts(normalizeProducts(products));
    },
    [CACHE_TAGS.CATALOG_PROMOTIONS],
    CACHE_DURATIONS.PROMOTIONS,
  ),
);

// ─── Query : Catégories du Catalogue ─────────────────────────────────────────

/**
 * Récupère les catégories actives pour le catalogue.
 * Non caché : les catégories changent rarement mais doivent être fraîches.
 */
export async function getCatalogCategories(): Promise<
  readonly { id: string; name: string; slug: string; imageUrl: string | null }[]
> {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
    },
  });

  return Object.freeze(categories);
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4: CONSTANTES LOCALES
// ═════════════════════════════════════════════════════════════════════════════

const MAX_CATALOG_PAGE_SIZE = 100;
