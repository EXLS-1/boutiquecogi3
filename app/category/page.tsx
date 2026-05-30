// app/category/page.tsx
import { Metadata } from "next";
import Category from "@/components/category/category";
import { ProductList } from "@/components/product/product-list";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Catégories | Boutique COGI", // Typo corrigée
  description: "Parcourez nos différentes catégories de mode : Femme, Homme, Enfant, Sacs et Accessoires.",
};

// Fonction légère, isolée et optimisée
// On ne prend que ce qui est strictement nécessaire pour l'affichage
async function getRecentProducts() {
  const products = await prisma.product.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    take: 8, // On limite le Payload à 8 produits
    select: {
      id: true,
      name: true,
      basePrice: true,
      productImages: true,
      stock: true, // Requis par ProductCard
    }
  });

  return products.map(p => ({
    ...p,
    image: p.productImages?.[0]?.url ?? "/placeholder.jpg",
    basePriceUSD: p.basePrice,
    basePriceCDF: p.basePrice * 2800, // À adapter selon ta source de vérité pour le taux
  }));
}

export default async function CategoryIndexPage() {
  // Disparition totale de la logique des cookies. Zustand fait ce travail.
  const recentProducts = await getRecentProducts();

  return (
    <main className="container mx-auto px-4 py-12 bg-background">
      {/* Composant de présentation des catégories */}
      <Category />
      
      {/* Affichage direct et optimisé des nouveautés */}
      <section className="mt-24">
        <div className="flex flex-col items-center justify-center space-y-4 mb-12">
          <h2 className="text-3xl md:text-4xl font-playfair font-bold uppercase text-foreground text-center">
            Nos récentes nouveautés
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto"></div>
        </div>
        
        <ProductList 
          products={recentProducts} 
          totalCount={8} 
          pageSize={8} 
        />
      </section>
    </main>
  );
}