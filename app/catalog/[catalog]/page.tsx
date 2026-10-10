// app/catalog/[catalog]/page.tsx
/**
 * =============================================================================
 * CATALOG CATEGORY PAGE — Boutiquecogi3 (Allégée)
 * =============================================================================
 * Page dynamique de catégorie avec validation de slug, parallélisation,
 * filtrage RBAC, pagination et gestion d'erreurs atomique.
 * Route: /[catalog] (ex: /femme, /homme, /enfant, /accessoires)
 */

import { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductList } from "@/components/product/product-list";
import { CategoryBreadcrumb } from "@/components/product-catalog/category-breadcrumb";
import { CategoryHeaderSection } from "@/components/product-catalog/category-header-section";
import { CategoryControlsSection } from "@/components/catalog/category-controls-section";
import { Pagination } from "@/components/product-catalog/pagination";
import { ProductListSkeleton } from "@/components/product/product-list-skeleton";
import { PartialErrorBanner } from "@/components/product-catalog/partial-error-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { BackToCatalog } from "@/components/catalog/back-to-catalog";
import {
  fetchCategoryPageData,
  getCategoryInfoBySlug,
} from "@/lib/product-catalog/catalog-fetchers";
import {
  buildCategoryMetadata,
  buildNotFoundCategoryMetadata,
} from "@/lib/product-catalog/catalog-metadata";
import {
  VALID_SORT_OPTIONS,
  type SortOption,
  type CategoryPageProps,
} from "@/lib/product-catalog/catalog-page-types";
import {
  CATALOG_OPTIONS,
  type CatalogOption,
  type SortableField,
} from "@/lib/product-catalog/catalog-types";
import { CATALOG_PAGE_SIZE } from "@/lib/product-catalog/catalog-constants";

export const revalidate = 300; // ISR 5 minutes

// ─── Validation ─────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isSortOption(value: string): value is SortOption {
  return VALID_SORT_OPTIONS.some((option) => option === value);
}

function isCatalogOption(value: string): value is CatalogOption {
  return CATALOG_OPTIONS.some((option) => option === value);
}

// ─── Métadonnées Dynamiques ─────────────────────────────────────────────────

export async function generateMetadata(
  { params }: CategoryPageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { catalog } = await params;

  const [categoryInfo, parentMetadata] = await Promise.all([
    getCategoryInfoBySlug(catalog).catch(() => null),
    parent,
  ]);

  if (!categoryInfo) {
    return buildNotFoundCategoryMetadata();
  }

  return buildCategoryMetadata(categoryInfo, {
    openGraph: parentMetadata.openGraph ?? undefined,
  });
}

// ─── Page Principale ─────────────────────────────────────────────────────────

export default async function CatalogCategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { catalog } = await params;

  // Validation du slug
  if (!SLUG_REGEX.test(catalog)) {
    notFound();
  }

  // Résolution des searchParams
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pageValue = Number.parseInt(
    firstSearchParam(resolvedSearchParams.page) ?? "1",
    10,
  );
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const rawSort = firstSearchParam(resolvedSearchParams.sort) ?? "newest";
  const sortOption: SortOption = isSortOption(rawSort) ? rawSort : "newest";
  // Mapping robuste option UI → champ triable Prisma (jamais de cast aveugle).
  const SORT_FIELD_MAP: Record<SortOption, SortableField> = {
    newest: "createdAt",
    "price-asc": "basePrice",
    "price-desc": "basePrice",
    promoted: "createdAt",
    "name-asc": "name",
    "name-desc": "name",
  };
  const SORT_ORDER_MAP: Record<SortOption, "asc" | "desc"> = {
    newest: "desc",
    "price-asc": "asc",
    "price-desc": "desc",
    promoted: "desc",
    "name-asc": "asc",
    "name-desc": "desc",
  };
  const sortBy: SortableField = SORT_FIELD_MAP[sortOption];
  const sortOrder: "asc" | "desc" = SORT_ORDER_MAP[sortOption];

  // Récupération des données — `catalogOption` validée contre le contrat Prisma.
  const rawCatalogOption = firstSearchParam(resolvedSearchParams.catalogOption);
  const catalogOption = rawCatalogOption && isCatalogOption(rawCatalogOption)
    ? rawCatalogOption
    : undefined;

  const data = await fetchCategoryPageData(
    catalog,
    page,
    sortBy,
    sortOrder,
    catalogOption
  );



  // Catégorie inexistante → 404
  if (!data.category || data.fetchError?.message?.includes("introuvable")) {
    notFound();
  }

  const { products, category, totalCount, fetchError, partialErrors } = data;
  const hasPartialError = partialErrors.length > 0;
  const totalPages = Math.ceil(totalCount / CATALOG_PAGE_SIZE);

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      {/* Breadcrumb */}
      <CategoryBreadcrumb categoryName={category.name} />

      {/* En-tête de catégorie */}
      <CategoryHeaderSection category={category} totalCount={totalCount} />

      {/* Alertes partielles */}
      {hasPartialError && (
        <div className="mb-8">
          <PartialErrorBanner
            errors={partialErrors}
            context="Certaines fonctionnalités sont temporairement indisponibles"
          />
        </div>
      )}

      {/* Barre de contrôles */}
      <CategoryControlsSection
        productsCount={products.length}
        totalCount={totalCount}
        currentSort={sortOption}
        categorySlug={catalog}
      />

      {/* Liste des produits */}
      <Suspense fallback={<ProductListSkeleton count={CATALOG_PAGE_SIZE} />}>
        {fetchError ? (
          <ErrorState
            message={`Impossible de charger les produits pour la catégorie "${category.name}".`}
          />
        ) : products.length === 0 ? (
          <EmptyState
            message={`Aucun produit disponible dans la catégorie "${category.name}" pour le moment.`}
            showBackLink
          />
        ) : (
          <>
            <ProductList
              products={products}
              totalCount={totalCount}
              pageSize={CATALOG_PAGE_SIZE}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                categorySlug={catalog}
                sortBy={sortOption}
              />
            )}
          </>
        )}
      </Suspense>

      {/* Retour au catalogue */}
      <BackToCatalog />
    </main>
  );
}
