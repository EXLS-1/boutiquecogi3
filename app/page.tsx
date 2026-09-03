// app/page.tsx

import { Suspense } from "react";
import { Hero } from "@/components/hero/image-show/hero";

import { ProductList } from "@/components/product/product-list";
import VideosCart from "@/components/hero/video-show/videos-cart";
import SocialNetworks from "@/components/social/social-network";
import Newsletter from "@/components/newsletter/newsletter";
import { HOME_PRODUCTS_LIMIT } from "@/lib/product-catalog/catalog-constants";
import { getRecentProducts } from "@/lib/product-catalog/catalog-queries";

export const revalidate = 300;

export default async function Home() {
  const recentProducts = await getRecentProducts();

  return (

    <>
      <Hero />

      <section className="py-16 bg-white min-h-75"> 
        
        {/* Ajout d'une hauteur minimale pour le loader */}

        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-3xl font-playfair font-bold uppercase mb-10 text-center">
            ARTICLES
          </h2>

          <Suspense fallback={<div className="text-center text-cyan-400 text-lg">Chargement des produits...</div>}>
            {recentProducts.length === 0 ? (
              <p className="text-center text-cyan-400 text-lg">
                Aucun produit disponible pour le moment.
              </p>
            ) : (
              <ProductList
                products={recentProducts}
                totalCount={recentProducts.length}
                pageSize={HOME_PRODUCTS_LIMIT}
              />
            )}
          </Suspense>


        </div>
      </section>

      <VideosCart />

      <SocialNetworks />

      {/* Section Newsletter adaptée au design system */}
      <section className="bg-cyan-50 text-cyan-400 border-t border-cyan-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-playfair font-bold uppercase mb-6">
              NEWSLETTER
            </h2>
            <Newsletter />

          </div>
        </div>
      </section>
    </>
  );
}
