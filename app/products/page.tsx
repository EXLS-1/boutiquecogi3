/**
 * =============================================================================
 * PRODUCTS PAGE - Boutiquecogi3
 * =============================================================================
 * Page catalog avec parsing serveur des params URL via nuqs.
 */

import { Suspense } from "react";
import { Metadata } from "next";
import { searchParamsCache } from "@/lib/product/search-params";
import { searchCatalogProducts } from "@/lib/catalog/catalog-queries";
import ProductCatalog from "@/components/product/product-catalog";
import { ProductListSkeleton } from "@/components/product/product-list";

export const metadata: Metadata = {
  title: "Nos Produits | Boutique COGI",
  description: "Découvrez notre collection de vêtements et accessoires.",
};

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // Parsing type-safe des params URL (nuqs server)
  const { q, page, category, sort, minPrice, maxPrice } = 
    await searchParamsCache.parse(await searchParams);

  // Récupération des produits
  const { products, totalCount } = await searchCatalogProducts({
    limit: 12,
    offset: (page - 1) * 12,
    categorySlug: category === "all" ? undefined : category,
    searchQuery: q || undefined,
    sortBy: sort === "newest" ? "createdAt" : 
            sort === "price-asc" ? "price" :
            sort === "price-desc" ? "price" :
            sort === "name-asc" ? "name" :
            sort === "name-desc" ? "name" : "createdAt",
    sortOrder: sort === "price-desc" || sort === "name-desc" ? "desc" : "asc",
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
  });

  const categories = ["all", "femme", "homme", "enfant", "sac", "chaussure", "accessoire"];

  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<ProductListSkeleton count={12} />}>
        <ProductCatalog
          products={products}
          totalCount={totalCount}
          categories={categories}
          title="Nos Produits"
          pageSize={12}
        />
      </Suspense>
    </main>
  );
}