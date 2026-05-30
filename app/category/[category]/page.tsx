// app/category/[category]/page.tsx

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductList } from "@/components/product/product-list";
import { CategoryCard } from "@/components/category/category-card";

const PAGE_SIZE = 12;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 1. Génération statique des chemins (ISR) pour des performances instantanées
export async function generateStaticParams() {
  try {
    const categories = await prisma.product.findMany({
      where: { isArchived: false },
      select: { category: true },
      distinct: ["category"],
    });
    
    return categories
      .filter((p) => p.category !== null)
      .map((p) => ({ category: p.category as string }));
  } catch (error) {
    console.error("Erreur generateStaticParams [Category]:", error);
    return [];
  }
}

// 2. Métadonnées dynamiques et optimisées pour le SEO
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const formattedTitle = category.charAt(0).toUpperCase() + category.slice(1);

  return {
    title: `${formattedTitle} | Boutique COGI`,
    description: `Découvrez notre collection exclusive d'articles pour la catégorie ${formattedTitle}.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  // Résolution des promesses Next.js 15+
  const { category } = await params;
  const sParams = await searchParams;

  const decodedCategory = decodeURIComponent(category);
  const page = Math.max(1, Number(sParams.page) || 1);
  const sort = (sParams.sort as string) || "newest";

  // Valider l'existence de la catégorie avant de requêter les produits
  const categoryExists = await prisma.product.findFirst({
    where: { category: decodedCategory, isArchived: false },
    select: { id: true },
  });

  if (!categoryExists) {
    notFound(); // Déclenche automatiquement le fichier not-found du segment
  }

  // Construction dynamique de la clause d'ordonnancement (OrderBy)
  let orderByClause: any = { createdAt: "desc" };
  if (sort === "price-asc") orderByClause = { price: "asc" };
  if (sort === "price-desc") orderByClause = { price: "desc" };

  // Exécution des requêtes en parallèle (Pattern Promise.all pour optimiser le TTFB)
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: {
        category: decodedCategory,
        isArchived: false,
      },
      orderBy: orderByClause,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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
    }),
    prisma.product.count({
      where: {
        category: decodedCategory,
        isArchived: false,
      },
    }),
  ]);

  // Normalisation stricte des données pour le composant client
  const formattedProducts = products.map((p) => ({
    ...p,
    image: p.productImages?.[0]?.url ?? "/placeholder.jpg",
    basePriceUSD: p.basePrice,
    basePriceCDF: p.basePrice * 2800, // Taux de change centralisé, à mettre à jour dynamiquement dans une vraie application
    isAvailable: p.availabilityProjection?.isAvailable ?? false
  }));

  const categoryTitle = decodedCategory.charAt(0).toUpperCase() + decodedCategory.slice(1);

  return (
    <main className="container mx-auto px-4 py-12 bg-background min-h-screen">
      <CategoryCard className="mb-8" />
      
      <section className="mt-12">
        <div className="flex flex-col items-center justify-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-4xl font-playfair font-bold uppercase text-foreground text-center tracking-wide">
            Collection : {categoryTitle}
          </h1>
          <div className="w-16 h-0.5 bg-primary"></div>
          <p className="text-sm text-muted-foreground">
            {totalCount} {totalCount > 1 ? "articles disponibles" : "article disponible"}
          </p>
        </div>

        {formattedProducts.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-xl bg-muted/30">
            <p className="text-muted-foreground font-lato">
              Aucun produit disponible dans cette section pour le moment.
            </p>
          </div>
        ) : (
          <ProductList 
            products={formattedProducts} 
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
          />
        )}
      </section>
    </main>
  );
}
