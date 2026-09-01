// components/product-promotion/promotions.tsx
/**
 * =============================================================================
 * SECTION PROMOTIONS - Boutiquecogi3
 * =============================================================================
 * Section dédiée aux promotions avec requête dédiée.
 */

import { Suspense } from "react";
import { getPromotionalProducts } from "@/lib/product-catalog/catalog-queries";
import { ProductList } from "../product/product-list";
import { ProductListSkeleton } from "../product/product-list-skeleton";
import { HOME_PRODUCTS_LIMIT } from "@/lib/product-catalog/catalog-constants";

export async function SectionPromotions() {
  const products: readonly unknown[] = (await getPromotionalProducts(HOME_PRODUCTS_LIMIT)) as readonly unknown[];

  return (
    <section aria-labelledby="promotions-heading" className="py-16 bg-rose-50/50">
      <div className="text-center mb-12">
        <h2 id="promotions-heading" className="text-3xl md:text-4xl font-playfair font-bold uppercase">
          Promotions
        </h2>
        <div className="w-24 h-1 bg-rose-500 mx-auto mt-4 rounded-full" />
        <p className="mt-4 text-slate-500">Profitez de nos meilleures offres</p>
      </div>

      <Suspense fallback={<ProductListSkeleton count={HOME_PRODUCTS_LIMIT} />}>
        <ProductList
          products={products}
          totalCount={products.length}
          pageSize={HOME_PRODUCTS_LIMIT}
        />
      </Suspense>
    </section>
  );
}