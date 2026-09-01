// app/nouveautes/page.tsx
/**
 * =============================================================================
 * PAGE NOUVEAUTÉS — Boutiquecogi3
 * =============================================================================
 * Liste des produits récents (moins de 90 jours), réutilisant la logique
 * métier de components/product-recent/product-recent.tsx (getRecentProducts).
 */

import { RecentProductsSection } from "@/components/product-recent/product-recent";
import { getRecentProducts } from "@/lib/product-catalog/catalog-queries";
import { resolveRbacContext } from "@/lib/product-catalog/catalog-rbac";
import { HOME_PRODUCTS_LIMIT } from "@/lib/product-catalog/catalog-constants";

export const revalidate = 300; // CACHE_DURATIONS.HOME_PRODUCTS

export const metadata = {
  title: "Nouveautés | Boutique COGI",
  description:
    "Découvrez nos derniers arrivages : les nouveaux produits de la boutique.",
};

export default async function NouveautesPage() {
  const [recentProducts, rbacContext] = await Promise.all([
    getRecentProducts(HOME_PRODUCTS_LIMIT),
    Promise.resolve().then(resolveRbacContext),
  ]);
  const { isAuthenticated } = rbacContext;

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      <RecentProductsSection
        products={recentProducts}
        pageSize={HOME_PRODUCTS_LIMIT}
        isAuthenticated={isAuthenticated}
      />
    </main>
  );
}