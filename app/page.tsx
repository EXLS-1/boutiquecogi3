// app/page.tsx

import { Hero } from "@/components/hero/hero";
import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list";
import VideosCart from "@/components/video-show/videos-cart";
import SocialNetworks from "@/components/social/social-network";

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

export default async function Home() {
  let recentProducts = [];
  
  try {
    const products = await getRecentProducts(
      HOME_PRODUCTS_LIMIT
    );
    recentProducts = products.map(mapCatalogProduct);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    // Optionnel: Redirection vers une page d'erreur ou affichage d'un message vide
  }

  return (
    <>
      <Hero />

      <Category />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-3xl font-playfair font-bold uppercase mb-10 text-center">
            ARTICLES DISPONIBLES
          </h2>

          <ProductList
            products={recentProducts}
            totalCount={recentProducts.length}
            pageSize={HOME_PRODUCTS_LIMIT}
          />

        </div>
      </section>

      <VideosCart />

      <SocialNetworks />
    </>
  );
}