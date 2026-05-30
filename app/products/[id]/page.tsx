// app/products/[id]/page.tsx

import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductNotFound } from "./products-not-found";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  try {
    // OPTIMISATION : On ne récupère QUE les IDs, rien d'autre.
    const products = await prisma.product.findMany({
      where: { isArchived: false },
      select: { id: true }, 
    });
    return products.map((p) => ({ id: p.id }));
  } catch (error) {
    console.error("Erreur generateStaticParams:", error);
    return [];
  }
}

// Fonction utilitaire mutualisée pour la metadata et le rendu
async function getProductData(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
  });
  
  if (!product) return null;

  return {
    ...product,
    image: product.productImages?.[0]?.url ?? "/placeholder.jpg",
    PriceUSD: product.basePrice,
    PriceCDF: product.basePrice * 2800,
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductData(id);

  if (!product) {
    return { title: "Produit introuvable | Boutique COGI" };
  }

  return {
    title: `${product.name} | Boutique COGI`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;

  try {
    const product = await getProductData(id);
    if (!product) notFound();

    return (
      <main className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4">
          <ProductDetail product={product} />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Erreur chargement produit:", error);
    return <ProductNotFound />;
  }
}