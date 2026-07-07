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
import { EmptyState } from "@/components/product-new/empty-state";
import { ErrorState } from "@/components/product-new/error-state";
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
import { CATALOG_PAGE_SIZE } from "@/lib/product-catalog/catalog-constants";

export const revalidate = 300; // ISR 5 minutes

// ─── Validation ─────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  const page = Math.max(
    1,
    parseInt(resolvedSearchParams.page ?? "1", 10) || 1
  );
  const rawSort = resolvedSearchParams.sort ?? "newest";
  const sortBy: SortOption = VALID_SORT_OPTIONS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "newest";

  // Récupération des données
  const rawCatalogOption = resolvedSearchParams.catalogOption ?? undefined;

  const data = await fetchCategoryPageData(
    catalog,
    page,
    sortBy,
    rawCatalogOption
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
        currentSort={sortBy}
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
                sortBy={sortBy}
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
