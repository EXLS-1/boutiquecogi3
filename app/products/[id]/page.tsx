// app/product/[id]/page.tsx

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductDetail } from "@/components/product-detail";
import type { Metadata } from "next";

export const revalidate = 60;

interface ProductPageProps {
  params: { id: string };
}

/* ---------- SSG ---------- */
export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { isArchived: false },
    select: { id: true },
  });

  return products.map(p => ({ id: p.id }));
}

/* ---------- SEO ---------- */
export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      description: true,
      images: true,
    },
  });

  if (!product) {
    return { title: "Produit introuvable | Boutique COGI" };
  }

  return {
    title: `${product.name} | Boutique COGI`,
    description: product.description ?? "",
    openGraph: {
      title: product.name,
      description: product.description ?? "",
      images: product.images?.[0]
        ? [{ url: product.images[0] }]
        : [],
    },
  };
}

/* ---------- PAGE ---------- */
export default async function ProductPage({ params }: ProductPageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) notFound();

  const formattedProduct = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images?.[0] ?? "/placeholder.jpg",
    description: product.description ?? "",
    category: product.category,
  };

  return (
    <main className="min-h-screen pt-20">
      <div className="container mx-auto px-4">
        <ProductDetail product={formattedProduct} />
      </div>
    </main>
  );
}
