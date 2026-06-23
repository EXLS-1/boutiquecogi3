/**
 * =============================================================================
 * SECTION NOUVEAUTÉS - Boutiquecogi3
 * =============================================================================
 * Section dédiée aux nouveautés avec requête dédiée et style distinct.
 */

import { Suspense } from "react";
import { getNewArrivalProducts } from "@/lib/catalog/catalog-queries";
import { ProductList } from "./catalog-product-list";
import { ProductListSkeleton } from "./catalog-product-list";
import { HOME_PRODUCTS_LIMIT } from "@/lib/catalog/catalog-constants";

export async function SectionNouveautes() {
  const products = await getNewArrivalProducts(HOME_PRODUCTS_LIMIT);

  return (
    <section aria-labelledby="nouveautes-heading" className="py-16">
      <div className="text-center mb-12">
        <h2 id="nouveautes-heading" className="text-3xl md:text-4xl font-playfair font-bold uppercase">
          Nouveautés
        </h2>
        <div className="w-24 h-1 bg-emerald-500 mx-auto mt-4 rounded-full" />
        <p className="mt-4 text-slate-500">Découvrez nos derniers arrivages</p>
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