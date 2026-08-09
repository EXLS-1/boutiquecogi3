// app/catalog

/**
 * =============================================================================
 * CATALOG INDEX PAGE — Boutiquecogi3 (Allégée)
 * =============================================================================
 * Page d'accueil du catalogue avec imports minimalistes.
 * ISR 5min, métadonnées dynamiques, streaming, gestion d'erreurs.
 */

import { Metadata, ResolvingMetadata } from "next";
import Category from "@/components/product-catalog/category";
import { FeaturedProductsSection } from "@/components/product-catalog/featured-products-section";
import { isRecentProduct } from "@/components/product-recent/products-recent";
import { TrustSection } from "@/components/product-catalog/trust-section";
import { PartialErrorBanner } from "@/components/product-catalog/partial-error-banner";
import {
  fetchCatalogIndexData,
} from "@/lib/product-catalog/catalog-fetchers";
import {
  getCatalogStatsForMetadata,
  buildCatalogIndexMetadata,
} from "@/lib/product-catalog/catalog-metadata";
import { resolveRbacContext } from "@/lib/product-catalog/catalog-rbac";
import { HOME_PRODUCTS_LIMIT } from "@/lib/product-catalog/catalog-constants";

export const revalidate = 300; // ISR 5 minutes

// ─── Métadonnées Dynamiques ─────────────────────────────────────────────────

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const [catalogStats, parentMetadata] = await Promise.all([
    getCatalogStatsForMetadata().catch(() => null),
    parent,
  ]);

  return buildCatalogIndexMetadata(catalogStats, {
    openGraph: parentMetadata.openGraph ?? undefined,
  });
}

// ─── Page Principale ─────────────────────────────────────────────────────────

export default async function CatalogIndexPage() {
  const [catalogData, rbacContext] = await Promise.all([
    fetchCatalogIndexData(),
    Promise.resolve().then(resolveRbacContext),
  ]);

  const { recentProducts, featuredProducts, categories, partialErrors } =
    catalogData;
  const { level: userRbacLevel, isAuthenticated } = rbacContext;
  const hasPartialError = partialErrors.length > 0;

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      {/* Section Catégories */}
      <Category
        userRbacLevel={userRbacLevel}
        isAuthenticated={isAuthenticated}
        categories={categories}
      />

      {/* Alertes partielles */}
      {hasPartialError && <PartialErrorBanner errors={partialErrors} />}

      {/* Section Produits en Vedette */}
      <FeaturedProductsSection products={featuredProducts} />

      {/* Section Nouveautés */}
      <RecentProductsSection
        products={recentProducts}
        pageSize={HOME_PRODUCTS_LIMIT}
        hasError={catalogData.fetchError !== null}
      />

      {/* Section Engagements */}
      <TrustSection />
    </main>
  );
}
