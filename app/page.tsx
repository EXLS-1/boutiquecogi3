// app/page.tsx

import { Suspense } from "react";
import { Hero } from "@/components/hero/hero";
import Category from "@/components/category/category";
import { ProductList } from "@/components/catalog/product-list";
import VideosCart from "@/components/video-show/videos-cart";
import SocialNetworks from "@/components/Social/social-network";
import { NewsletterForm } from "@/components/newsletter/newsletter-form.client";

import { HOME_PRODUCTS_LIMIT } from "@/lib/catalog/catalog-constants";
import { getFallbackCatalog } from "@/data/fallback-catalog";
import { getRecentProducts } from "@/lib/catalog/catalog-queries";
import { mapCatalogProduct } from "@/lib/catalog/catalog-mappers";

export const revalidate = 300;

export default async function Home() {
  

  return (
    <>
      <Hero />

      <Category />

      <section className="py-16 bg-white min-h-75"> {/* Ajout d'une hauteur minimale pour le loader */}
        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-3xl font-playfair font-bold uppercase mb-10 text-center">
            ARTICLES DISPONIBLES
          </h2>

          <Suspense fallback={<getFallbackCatalog />}>
            {recentProducts.length === 0 ? (
              <p className="text-center text-cyan-400 text-lg">Aucun produit disponible pour le moment.</p>
            ) : (
              <ProductList
                products={recentProducts}
                totalCount={recentProducts.length} // totalCount est suffisant pour une liste non paginée
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
          <div className="max-w-4xl mx-auto">
            <NewsletterForm 
              onSubscribe={handleSubscribe}
              title="NEWSLETTER"
              description="Recevez nos offres exclusives et soyez informé de nos nouvelles collections avant tout le monde."
              className="text-center"
            />
          </div>
        </div>
      </section>
    </>
  );
}
