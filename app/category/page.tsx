// app/category/page.tsx
import { Suspense } from "react";

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

// Définition de l'interface pour un produit, basée sur le mappage
interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catégories | Boutique COGI",
  description:
    "Parcourez nos différentes catégories de produits.",
};

export default async function CategoryIndexPage() {
  let recentProducts: Product[] = [];
  try {
    const products = await getRecentProducts(HOME_PRODUCTS_LIMIT);
    recentProducts = products.map(mapCatalogProduct);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits récents pour la page catégorie:", error);
  }

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

      <Suspense fallback={<ProductListLoading />}>
        {recentProducts.length === 0 ? (
          <p className="text-center text-gray-500 text-lg">Aucun produit récent disponible pour le moment.</p>
        ) : (
          <ProductList
            products={recentProducts}
            totalCount={recentProducts.length}
            pageSize={HOME_PRODUCTS_LIMIT}
          />
        )}
      </Suspense>

      </section>

    </main>
  );
}

// Composant de chargement pour la section produits (réutilisé de app/page.tsx)
function ProductListLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
      {[...Array(HOME_PRODUCTS_LIMIT)].map((_, i) => (
        <div key={i} className="border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="w-full h-48 bg-gray-200 rounded-md mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
