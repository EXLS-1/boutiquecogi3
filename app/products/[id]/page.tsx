// app/products/[id]/page.tsx

import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { ProductDetail } from "@/components/product/product-detail";
import { ProductNotFound } from "./products-not-found";

import {
  mapCatalogProduct,
} from "@/lib/catalog/catalog-mappers";

export const revalidate = 3600;

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const products =
      await prisma.product.findMany({
        where: {
          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    return products.map(
      (product) => ({
        id: product.id,
      }),
    );
  } catch (error) {
    console.error(
      "generateStaticParams error:",
      error,
    );

    return [];
  }
}

const getProductData = cache(
  async (id: string) => {
    const product =
      await prisma.product.findFirst({
        where: {
          id,

          isArchived: false,
          isdeleted: false,
          deletedAt: null,
        },

        include: {
          category: true,

          availabilityProjection: true,

          productImages: {
            orderBy: {
              position: "asc",
            },
          },

          variants: true,
        },
      });

    if (!product) {
      return null;
    }

    return mapCatalogProduct(product);
  },
);

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;

  const product =
    await getProductData(id);

  if (!product) {
    return {
      title:
        "Produit introuvable | Boutique COGI",
    };
  }

  return {
    title: `${product.name} | Boutique COGI`,

    description:
      product.description ??
      product.name,

    openGraph: {
      title: product.name,

      description:
        product.description ??
        product.name,

      images: product.image
        ? [
            {
              url: product.image,
            },
          ]
        : [],
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  try {
    const { id } = await params;

    const product =
      await getProductData(id);

    if (!product) {
      notFound();
    }

    return (
      <main className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4">
          <ProductDetail
            product={product}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error(
      "Product page error:",
      error,
    );

    return <ProductNotFound />;
  }
}
