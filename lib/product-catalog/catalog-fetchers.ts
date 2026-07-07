// lib/catalog/catalog-fetchers.ts
/**
 * =============================================================================
 * DATA FETCHERS — Pages Catalogue
 * =============================================================================
 * Logiques de récupération de données centralisées avec gestion granulaire
 * d'erreurs, parallélisation des requêtes, et filtrage RBAC.
 */

import {
  HOME_PRODUCTS_LIMIT,
  CATALOG_PAGE_SIZE,
} from "@/lib/product-catalog/catalog-constants";
import {
  getRecentProducts,
  getFeaturedProducts,
  getCatalogCategories,
  getProductsByCategory,
  searchCatalogProducts,
} from "@/lib/product-catalog/catalog-queries";
import {
  filterProductsByAccessPolicy,
} from "@/lib/product-catalog/catalog-mappers";
import type {
  CatalogCategory,
  CatalogIndexData,
  CatalogCategoryData,
  CategoryInfo,
  PartialError,
} from "./catalog-page-types";
import type { CatalogProduct } from "./catalog-types";
import { resolveRbacContext } from "./catalog-rbac";


// ─── Helpers privés ─────────────────────────────────────────────────────────

function createPartialError(source: string, err: unknown): PartialError {
  return {
    source,
    message: err instanceof Error ? err.message : `Erreur récupération ${source}`,
  };
}

function logPartialErrors(context: string, errors: readonly PartialError[]): void {
  console.warn(`[${context}] Erreurs partielles:`, errors);
}

// ─── Fetcher: Page Index ────────────────────────────────────────────────────

/**
 * Récupère toutes les données nécessaires à la page index du catalogue.
 * Parallélise les 3 requêtes indépendantes avec gestion granulaire d'erreurs.
 */
export async function fetchCatalogIndexData(): Promise<CatalogIndexData> {
  const partialErrors: PartialError[] = [];

  const [recentProductsRaw, featuredProductsRaw, categoriesRaw] = await Promise.all([
    getRecentProducts(HOME_PRODUCTS_LIMIT).catch((err: unknown) => {
      partialErrors.push(createPartialError("recentProducts", err));
      return [] as Awaited<ReturnType<typeof getRecentProducts>>;
    }),

    getFeaturedProducts(6).catch((err: unknown) => {
      partialErrors.push(createPartialError("featuredProducts", err));
      return [] as Awaited<ReturnType<typeof getFeaturedProducts>>;
    }),

    getCatalogCategories().catch((err: unknown) => {
      partialErrors.push(createPartialError("categories", err));
      return [] as CatalogCategory[];
    }),
  ]) as [
      readonly CatalogProduct[],
      readonly CatalogProduct[],
      readonly CatalogCategory[],
    ];

  const fetchError =
    recentProductsRaw.length === 0 &&
      featuredProductsRaw.length === 0 &&
      categoriesRaw.length === 0
      ? new Error(
        `Échec total du chargement du catalogue. Erreurs: ${partialErrors
          .map((e) => `[${e.source}] ${e.message}`)
          .join("; ")}`
      )
      : null;

  if (partialErrors.length > 0 && !fetchError) {
    logPartialErrors("CatalogIndex", partialErrors);
  }

  return {
    recentProducts: Object.freeze(recentProductsRaw),
    featuredProducts: Object.freeze(featuredProductsRaw),
    categories: Object.freeze(categoriesRaw),
    fetchError,
    partialErrors: Object.freeze(partialErrors),
  };
}

// ─── Fetcher: Infos catégorie par slug ──────────────────────────────────────

/**
 * Récupère les informations d'une catégorie à partir de son slug.
 * @returns CategoryInfo | null — null si la catégorie n'existe pas
 */
export async function getCategoryInfoBySlug(
  slug: string
): Promise<CategoryInfo | null> {
  const categories = await getCatalogCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: null, // TODO: Ajouter description dans le schéma Prisma Category
    imageUrl: category.imageUrl,
  };
}

// ─── Fetcher: Page Catégorie ────────────────────────────────────────────────

/**
 * Récupère toutes les données nécessaires à une page de catégorie.
 * Inclut la parallélisation, le filtrage RBAC, et la pagination.
 */
import type { CatalogOption, SortableField } from "./catalog-types";

export async function fetchCategoryPageData(
  categorySlug: string,
  page: number = 1,
  sortBy: SortableField = "createdAt",
  catalogOption?: CatalogOption
): Promise<CatalogCategoryData> {



  const partialErrors: PartialError[] = [];
  const limit = CATALOG_PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Parallélisation : catégorie + produits
  const [categoryInfo, productsRaw] = await Promise.all([
    getCategoryInfoBySlug(categorySlug).catch((err: unknown) => {
      partialErrors.push(createPartialError("categoryInfo", err));
      return null;
    }),

    (async () => {
      try {
        if (catalogOption) {
          const { products } = await searchCatalogProducts({
            limit: limit + offset,
            offset: 0,
            categorySlug,
            sortBy,
            sortOrder: "desc",
            catalogOption,
          });
          return products;
        }

        return await getProductsByCategory(categorySlug, limit + offset);

      } catch (err) {
        partialErrors.push(createPartialError("products", err));
        return [];
      }
    })(),
  ]);


  // Catégorie inexistante → retourne un fetchError pour déclencher notFound()
  if (!categoryInfo) {
    return {
      products: Object.freeze([]),
      category: null,
      totalCount: 0,
      fetchError: new Error(`Catégorie "${categorySlug}" introuvable`),
      partialErrors: Object.freeze(partialErrors),
    };
  }

  // Filtrage RBAC côté serveur
  const rbacContext = resolveRbacContext();
  const filteredProducts = filterProductsByAccessPolicy(
    productsRaw,
    rbacContext.level,
    rbacContext.isAuthenticated
  );

  // Pagination manuelle (offset/limit)
  const paginatedProducts = filteredProducts.slice(offset, offset + limit);

  const fetchError =
    paginatedProducts.length === 0 && productsRaw.length === 0
      ? new Error(`Aucun produit disponible dans la catégorie "${categorySlug}".`)
      : null;

  if (partialErrors.length > 0 && !fetchError) {
    logPartialErrors("CategoryPage", partialErrors);
  }

  return {
    products: Object.freeze(paginatedProducts),
    category: categoryInfo,
    totalCount: filteredProducts.length,
    fetchError,
    partialErrors: Object.freeze(partialErrors),
  };
}
