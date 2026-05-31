// app/category/page.tsx

import { Metadata } from "next";

import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list";

import {
  HOME_PRODUCTS_LIMIT,
} from "@/lib/catalog/catalog-constants";

import {
  getRecentProducts,
} from "@/lib/catalog/catalog-queries";

import {
  mapCatalogProduct,
} from "@/lib/catalog/catalog-mappers";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catégories | Boutique COGI",
  description:
    "Parcourez nos différentes catégories de produits.",
};

export default async function CategoryIndexPage() {
  const products =
    await getRecentProducts(
      HOME_PRODUCTS_LIMIT,
    );

  const recentProducts =
    products.map(mapCatalogProduct);

  return (
    <main className="container mx-auto px-4 py-12 bg-background">

      <Category />

      <section className="mt-24">

        <div className="flex flex-col items-center justify-center space-y-4 mb-12">

          <h2 className="text-3xl md:text-4xl font-playfair font-bold uppercase text-center">
            Nos récentes nouveautés
          </h2>

          <div className="w-24 h-1 bg-primary" />

        </div>

        <ProductList
          products={recentProducts}
          totalCount={
            recentProducts.length
          }
          pageSize={
            HOME_PRODUCTS_LIMIT
          }
        />

      </section>

    </main>
  );
}
