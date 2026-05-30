// app/products/page.tsx

import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductCatalog from "@/components/product/product-catalog";
import { CategoryCard } from "@/components/category/category-card";

export const metadata: Metadata = {
  title: "Catalogue | Boutique COGI",
  description: "Parcourez notre collection complète de produits.",
};

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  // 1. Extraction sécurisée des paramètres URL
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = (params.sort as string) || "newest";
  const category = (params.category as string) || "all";
  const query = (params.q as string) || "";

  // 2. Construction dynamique de la clause WHERE pour Prisma
  const whereClause: any = { isArchived: false };
  
  if (category !== "all") {
    whereClause.category = category;
  }
  
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
    ];
  }

  // 3. Construction dynamique de la clause ORDER BY
  let orderByClause: any = { createdAt: "desc" }; // "newest" par défaut
  if (sort === "basePrice-asc") orderByClause = { basePrice: "asc" }; // Ajuste avec ton champ exact (baseprice ou priceUSD)
  if (sort === "basePrice-desc") orderByClause = { basePrice: "desc" };

  // 4. Exécution parallèle optimisée (Requête des données + Comptage total + Catégories)
  const [products, totalCount, distinctCategories] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId
      },
      orderBy: orderByClause,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        basePrice: true, // ou priceUSD / priceCDF selon ton schéma
        description: true,
        
        productImages: {
        select: { url: true },
        take: 1, // On ne prend que la première image pour la performance
      },
      availabilityProjection: {
        select: { isAvailable: true }
      }
      },
    }),
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: { isArchived: false },
      select: { category: true },
      distinct: ['categoryId'],
    }),
  ]);

  // Formatage des catégories pour le filtre
  const categoriesList = ["all", ...distinctCategories.map(c => c.category).filter(Boolean)];

  // Formatage défensif des produits pour le client
  const formattedProducts = products.map((p) => ({
    ...p,
    image: p.productImages?.[0]?.url ?? "/placeholder.webp",
    basePriceUSD: p.basePrice, // Mapping sécurisé selon l'interface attendue par ProductCard
    basePriceCDF: p.basePrice * 2800, // À ajuster si tu as déjà le priceCDF en base
  }));

  return (
    <main className="pb-12 bg-background">
      <CategoryCard className="mb-8" />
      <ProductCatalog 
        title="Notre Catalogue"
        products={formattedProducts}
        totalCount={totalCount}
        categories={categoriesList}
      />
    </main>
  );
}