// app/page.tsx
import { Suspense } from "react";
import { z } from "zod";
import { Hero } from "@/components/hero/hero";
import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list";
import VideosCart from "@/components/video-show/videos-cart";
import SocialNetworks from "@/components/social/social-network";
import Newsletter from "@/components/newsletter";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/exchange-rate/exchange-rate-cache";
import { Product } from "@/types/products";

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

export default async function Home() {
  let recentProducts: Product[] = [];
  
  try {
    const products = await getRecentProducts(HOME_PRODUCTS_LIMIT);
    recentProducts = products.map(mapCatalogProduct);
  } catch (error) {
    console.error("Erreur lors de la récupération des produits récents:", error);
  }

  /**
   * Server Action pour la gestion de la newsletter.
   * Assure la sécurité et la performance côté serveur.
   */
  const handleSubscribe = async (email: string) => {
    "use server";
    try {
      z.string().email().parse(email);
      
      // Utilisation d'upsert pour éviter les erreurs si l'email existe déjà
      // tout en mettant à jour si nécessaire (ou simplement ne rien faire)
      await (prisma as any).newsletterSubscriber.upsert({
        where: { email },
        update: {}, 
        create: {
          id: generateUUIDv7(),
          email,
        },
      });
      
      return { success: true, message: "Merci de nous avoir rejoints !" };
    } catch {
      return { success: false, message: "L'adresse e-mail est invalide." };
    }
  };

  return (
    <>
      <Hero />

      <Category />

      <section className="py-16 bg-white min-h-75"> {/* Ajout d'une hauteur minimale pour le loader */}
        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-3xl font-playfair font-bold uppercase mb-10 text-center">
            ARTICLES DISPONIBLES
          </h2>

          <Suspense fallback={<ProductListLoading />}>
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
            <Newsletter 
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

// Composant de chargement pour la section produits
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