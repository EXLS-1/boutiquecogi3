/**
 * =============================================================================
 * CATALOG CATEGORY PAGE - Boutiquecogi3
 * =============================================================================
 * Page dynamique de catégorie avec validation de slug, parallélisation,
 * métadonnées dynamiques, filtrage RBAC, et gestion d'erreurs atomique.
 * Route: /[catalog] (ex: /femme, /homme, /enfant, /accessoires)
 */

import { Suspense } from "react";
import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { ProductList } from "@/components/catalog/product-list";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PackageSearch,
  AlertTriangle,
  ArrowLeft,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import {
  CATALOG_PAGE_SIZE,
  PRODUCT_PLACEHOLDER,
  CACHE_TAGS,
  CACHE_DURATIONS,
} from "@/lib/catalog/catalog-constants";
import {
  getProductsByCategory,
  getCatalogCategories,
} from "@/lib/catalog/catalog-queries";
import {
  mapCatalogProducts,
  filterProductsByAccessPolicy,
} from "@/lib/catalog/catalog-mappers";
import { RBAC_LEVELS, type RbacLevel } from "@/lib/category/category-types";
import type { CatalogProduct } from "@/lib/catalog/catalog-types";

// ─── Revalidation ISR ───────────────────────────────────────────────────────
export const revalidate = 300; // 5 minutes

// ─── Types ──────────────────────────────────────────────────────────────────
interface CategoryPageProps {
  readonly params: Promise<{ readonly catalog: string }>;
  readonly searchParams?: Promise<{
    readonly page?: string;
    readonly sort?: string;
    readonly filter?: string;
  }>;
}

interface CategoryInfo {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
}

interface RbacContext {
  readonly level: RbacLevel;
  readonly isAuthenticated: boolean;
}

interface CategoryPageData {
  readonly products: readonly CatalogProduct[];
  readonly category: CategoryInfo | null;
  readonly totalCount: number;
  readonly fetchError: Error | null;
  readonly partialErrors: readonly PartialError[];
}

interface PartialError {
  readonly source: string;
  readonly message: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const FALLBACK_RBAC: RbacContext = {
  level: RBAC_LEVELS.GUEST,
  isAuthenticated: false,
};

const VALID_SORT_OPTIONS = [
  "newest",
  "price-asc",
  "price-desc",
  "name-asc",
  "name-desc",
  "promoted",
] as const;

type SortOption = (typeof VALID_SORT_OPTIONS)[number];

// ─── Métadonnées Dynamiques ─────────────────────────────────────────────────
export async function generateMetadata(
  { params }: CategoryPageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { catalog } = await params;

  // Récupération parallèle de la catégorie et des métadonnées parent
  const [categoryInfo, parentMetadata] = await Promise.all([
    getCategoryInfoBySlug(catalog).catch(() => null),
    parent,
  ]);

  const previousImages = parentMetadata.openGraph?.images || [];

  // Si catégorie inexistante, métadonnées minimales (sera redirigé vers 404)
  if (!categoryInfo) {
    return {
      title: "Catégorie non trouvée | Boutique COGI",
      robots: { index: false, follow: true },
    };
  }

  const categoryName = categoryInfo.name;
  const description =
    categoryInfo.description ??
    `Découvrez notre collection ${categoryName.toLowerCase()} chez Boutique COGI. ` +
      `Des produits soigneusement sélectionnés pour vous.`;

  return {
    title: `${categoryName} | Boutique COGI`,
    description,
    keywords: [
      categoryName.toLowerCase(),
      "mode",
      "boutique",
      "cogi",
      "collection",
      "shopping",
    ],
    openGraph: {
      title: `${categoryName} | Boutique COGI`,
      description,
      type: "website",
      siteName: "Boutique COGI",
      locale: "fr_FR",
      images: [
        {
          url: categoryInfo.imageUrl ?? "/og/catalog-default.jpg",
          width: 1200,
          height: 630,
          alt: `Collection ${categoryName} - Boutique COGI`,
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} | Boutique COGI`,
      description,
      images: [categoryInfo.imageUrl ?? "/og/catalog-default.jpg"],
    },
    alternates: {
      canonical: `/${catalog}`,
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  };
}

// ─── Fonction de récupération centralisée ───────────────────────────────────
async function fetchCategoryPageData(
  categorySlug: string,
  page: number = 1,
  sortBy: SortOption = "newest",
): Promise<CategoryPageData> {
  const partialErrors: PartialError[] = [];
  const limit = CATALOG_PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Parallélisation : catégorie + produits
  const [categoryInfo, productsRaw] = await Promise.all([
    getCategoryInfoBySlug(categorySlug).catch((err: unknown) => {
      partialErrors.push({
        source: "categoryInfo",
        message: err instanceof Error ? err.message : "Erreur récupération catégorie",
      });
      return null;
    }),

    getProductsByCategory(categorySlug, limit + offset)
      .catch((err: unknown) => {
        partialErrors.push({
          source: "products",
          message: err instanceof Error ? err.message : "Erreur récupération produits",
        });
        return [] as readonly CatalogProduct[];
      }),
  ]);

  // Si la catégorie n'existe pas, on retourne null pour déclencher notFound()
  if (!categoryInfo) {
    return {
      products: [],
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
    rbacContext.isAuthenticated,
  );

  // Pagination manuelle (offset/limit)
  const paginatedProducts = filteredProducts.slice(offset, offset + limit);

  const fetchError =
    paginatedProducts.length === 0 && productsRaw.length === 0
      ? new Error(
          `Aucun produit disponible dans la catégorie "${categorySlug}".`
        )
      : null;

  if (partialErrors.length > 0 && !fetchError) {
    console.warn("[CategoryPage] Erreurs partielles:", partialErrors);
  }

  return {
    products: Object.freeze(paginatedProducts),
    category: categoryInfo,
    totalCount: filteredProducts.length,
    fetchError,
    partialErrors: Object.freeze(partialErrors),
  };
}

// ─── Helper: Récupérer les infos d'une catégorie par slug ───────────────────
async function getCategoryInfoBySlug(
  slug: string,
): Promise<CategoryInfo | null> {
  const categories = await getCatalogCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) return null;

  // Enrichissement avec description si disponible (à adapter selon votre schéma Prisma)
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: null, // TODO: Ajouter description dans le schéma Prisma Category
    imageUrl: category.imageUrl,
  };
}

// ─── Fallback RBAC ──────────────────────────────────────────────────────────
function resolveRbacContext(): RbacContext {
  try {
    // TODO: Intégration Better-Auth
    return FALLBACK_RBAC;
  } catch (error) {
    console.error("[CategoryPage] Erreur résolution RBAC, fallback GUEST:", error);
    return FALLBACK_RBAC;
  }
}

// ─── Parse et validation des searchParams ───────────────────────────────────
function parseSearchParams(
  searchParams: CategoryPageProps["searchParams"],
): { page: number; sort: SortOption } {
  const defaults = { page: 1, sort: "newest" as SortOption };

  if (!searchParams) return defaults;

  // Note: searchParams est un Promise dans Next.js 16, on le résout dans le composant
  return defaults; // Sera surchargé dans le composant principal
}

// ─── Page Principale ─────────────────────────────────────────────────────────
export default async function CatalogCategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { catalog } = await params;

  // Validation du slug (format: lettres, chiffres, tirets uniquement)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(catalog)) {
    notFound();
  }

  // Résolution des searchParams
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const page = Math.max(1, parseInt(resolvedSearchParams.page ?? "1", 10) || 1);
  const rawSort = resolvedSearchParams.sort ?? "newest";
  const sortBy: SortOption = VALID_SORT_OPTIONS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "newest";

  // Récupération des données
  const data = await fetchCategoryPageData(catalog, page, sortBy);

  // Catégorie inexistante -> 404
  if (!data.category || data.fetchError?.message.includes("introuvable")) {
    notFound();
  }

  const { products, category, totalCount, fetchError, partialErrors } = data;
  const rbacContext = resolveRbacContext();
  const hasPartialError = partialErrors.length > 0;
  const totalPages = Math.ceil(totalCount / CATALOG_PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      {/* ─── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav aria-label="Fil d'Ariane" className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-slate-500">
          <li>
            <Link href="/catalogue" className="hover:text-cyan-600 transition-colors">
              Catalogue
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-slate-900 font-medium" aria-current="page">
            {category.name}
          </li>
        </ol>
      </nav>

      {/* ─── En-tête de catégorie ───────────────────────────────────────── */}
      <header className="mb-12">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[200px] md:min-h-[280px] flex items-end">
          <ImageWithFallback
            src={category.imageUrl ?? PRODUCT_PLACEHOLDER}
            fallbackSrc={PRODUCT_PLACEHOLDER}
            alt={`Bannière ${category.name}`}
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="relative z-10 p-6 md:p-10 w-full">
            <h1 className="text-3xl md:text-5xl font-playfair font-bold text-white mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-slate-200 text-lg max-w-2xl">{category.description}</p>
            )}
            <p className="text-slate-300 text-sm mt-3">
              {totalCount} produit{totalCount > 1 ? "s" : ""} disponible
              {totalCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </header>

      {/* ─── Alertes partielles ────────────────────────────────────────── */}
      {hasPartialError && (
        <PartialErrorBanner errors={partialErrors} />
      )}

      {/* ─── Barre de contrôles (filtres + tri) ───────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900">
            Produits
          </h2>
          <span className="text-sm text-slate-500">
            ({products.length} / {totalCount})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <span className="text-sm text-slate-500">Trier par:</span>
          <SortDropdown currentSort={sortBy} categorySlug={catalog} />
        </div>
      </div>

      {/* ─── Liste des produits ─────────────────────────────────────────── */}
      <Suspense fallback={<ProductListLoadingSkeleton count={CATALOG_PAGE_SIZE} />}>
        {fetchError ? (
          <ErrorState
            message={`Impossible de charger les produits pour la catégorie "${category.name}".`}
          />
        ) : products.length === 0 ? (
          <EmptyState
            message={`Aucun produit disponible dans la catégorie "${category.name}" pour le moment.`}
          />
        ) : (
          <>
            <ProductList
              products={products}
              totalCount={totalCount}
              pageSize={CATALOG_PAGE_SIZE}
            />

            {/* ─── Pagination ─────────────────────────────────────────── */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                categorySlug={catalog}
                sortBy={sortBy}
              />
            )}
          </>
        )}
      </Suspense>

      {/* ─── Retour au catalogue ──────────────────────────────────────── */}
      <div className="mt-16 text-center">
        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au catalogue
        </Link>
      </div>
    </main>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

/**
 * Dropdown de tri (côté serveur via URL params)
 */
function SortDropdown({
  currentSort,
  categorySlug,
}: {
  readonly currentSort: SortOption;
  readonly categorySlug: string;
}) {
  const sortLabels: Record<SortOption, string> = {
    newest: "Nouveautés",
    "price-asc": "Prix croissant",
    "price-desc": "Prix décroissant",
    "name-asc": "Nom A-Z",
    "name-desc": "Nom Z-A",
    promoted: "En vedette",
  };

  return (
    <div className="relative">
      <select
        name="sort"
        defaultValue={currentSort}
        onChange={(e) => {
          const url = new URL(window.location.href);
          url.searchParams.set("sort", e.target.value);
          window.location.href = url.toString();
        }}
        className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent cursor-pointer"
        aria-label="Trier les produits"
      >
        {VALID_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {sortLabels[option]}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Pagination côté client (navigation via URL)
 */
function Pagination({
  currentPage,
  totalPages,
  categorySlug,
  sortBy,
}: {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly categorySlug: string;
  readonly sortBy: SortOption;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const maxVisible = 5;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  const visiblePages = pages.slice(startPage - 1, endPage);

  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    if (pageNum > 1) params.set("page", pageNum.toString());
    if (sortBy !== "newest") params.set("sort", sortBy);
    const query = params.toString();
    return `/${categorySlug}${query ? `?${query}` : ""}`;
  };

  return (
    <nav aria-label="Pagination" className="mt-12 flex justify-center items-center gap-2">
      {/* Previous */}
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Page précédente"
        >
          ←
        </Link>
      )}

      {/* Pages */}
      {startPage > 1 && (
        <>
          <Link
            href={buildUrl(1)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            1
          </Link>
          {startPage > 2 && <span className="px-2 text-slate-400">...</span>}
        </>
      )}

      {visiblePages.map((page) => (
        <Link
          key={page}
          href={buildUrl(page)}
          className={`px-3 py-2 rounded-lg border transition-colors ${
            page === currentPage
              ? "bg-cyan-600 text-white border-cyan-600"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Link>
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2 text-slate-400">...</span>}
          <Link
            href={buildUrl(totalPages)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next */}
      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Page suivante"
        >
          →
        </Link>
      )}
    </nav>
  );
}

/**
 * Composant de loading sophistiqué
 */
function ProductListLoadingSkeleton({ count }: { readonly count: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      aria-label="Chargement des produits"
      role="status"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-slate-200 rounded-xl p-4 shadow-sm animate-pulse"
        >
          <div className="relative w-full aspect-[4/5] rounded-lg mb-4 bg-slate-200 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-shimmer" />
            <div className="absolute top-2 right-2 w-10 h-6 rounded bg-slate-300/50" />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-16 rounded-full bg-slate-200" />
            <div className="h-5 w-12 rounded-full bg-slate-200" />
          </div>
          <div className="h-6 rounded bg-slate-200 w-3/4 mb-2" />
          <div className="flex items-center gap-2 mb-3">
            <div className="h-5 rounded bg-slate-200 w-20" />
            <div className="h-4 rounded bg-slate-200 w-14" />
          </div>
          <div className="flex items-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-4 rounded-full bg-slate-200" />
            ))}
            <div className="h-4 rounded bg-slate-200 w-8 ml-1" />
          </div>
          <div className="h-10 rounded-lg bg-slate-200 w-full" />
        </div>
      ))}
      <span className="sr-only">Chargement des produits en cours...</span>
    </div>
  );
}

/**
 * Bannière d'erreurs partielles
 */
function PartialErrorBanner({ errors }: { readonly errors: readonly PartialError[] }) {
  return (
    <div
      className="mb-8 p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <div>
        <p className="text-amber-800 font-medium text-sm">
          Certaines fonctionnalités sont temporairement indisponibles
        </p>
        <ul className="mt-1 text-amber-700 text-xs space-y-0.5">
          {errors.map((err, i) => (
            <li key={i}>• {err.source}: {err.message}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16">
      <PackageSearch className="h-12 w-12 text-slate-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-slate-500 text-lg">{message}</p>
      <Link
        href="/catalogue"
        className="inline-block mt-4 text-cyan-600 hover:text-cyan-700 font-medium"
      >
        Explorer le catalogue
      </Link>
    </div>
  );
}

function ErrorState({ message }: { readonly message: string }) {
  return (
    <div className="text-center py-16 border border-red-200 bg-red-50 rounded-xl">
      <AlertTriangle className="h-12 w-12 text-red-300 mx-auto mb-4" aria-hidden="true" />
      <p className="text-red-600 text-lg font-medium">{message}</p>
      <p className="text-red-400 text-sm mt-2">
        Si le problème persiste, contactez notre support.
      </p>
    </div>
  );
}