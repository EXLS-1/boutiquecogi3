// app/page.tsx

import { Hero } from "@/components/hero/hero";
import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list"; // On utilise directement la liste
import VideosCart from '@/components/video-show/videos-cart';
import SocialNetworks from '@/components/social/social-network';
import { prisma } from "@/lib/prisma";

// Fonction dédiée et ultra-légère
async function getRecentProducts() {
  const products = await prisma.product.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    take: 8, // Seulement les 8 plus récents
    select: {
      id: true,
      name: true,
      basePrice: true,
      productImages: {
        select: { url: true },
        take: 1, // On ne prend que la première image pour la performance
      },
      availabilityProjection: {
        select: { isAvailable: true }
    }
    },
  });

  return products.map(p => ({
    ...p,
    image: p.productImages?.[0]?.url ?? "/placeholder.webp",
    priceUSD: p.basePrice, // Mapping de basePrice vers priceUSD
    priceCDF: p.basePrice * 2800, // Calcul pour le CDF
  }));
}

export default async function Home() {
  const recentProducts = await getRecentProducts();

  return (
    <>
      <Hero />
      <Category />
      
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-playfair font-bold uppercase mb-10 text-center">
            ARTICLES DISPONIBLES
          </h2>
          {/* On passe directement les produits à la liste, pas besoin du catalogue complet ici */}
          <ProductList products={recentProducts} totalCount={8} pageSize={8} />
        </div>
      </section>

      <VideosCart />
      <SocialNetworks />
    </>
  );
}