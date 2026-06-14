import { productData } from "@/data/product-data";
import { Product } from "@/types/products";
import { prisma } from "@/lib/prisma";
import { cache } from "react";

const EXCHANGE_RATE_CDF = Number(process.env.EXCHANGE_RATE_CDF) || 2400;

function mapJsonProduct(p: Record<string, unknown>): Product {
  const basePrice = Number(p.price || 0);
  let cleanPath = String(p.image || "");
  if (cleanPath && !cleanPath.startsWith("/media/")) {
    cleanPath = `/media${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
  }

  return {
    id: String(p.id),
    name: String(p.name || "Produit sans nom"),
    description: String(p.description || "Aucune description disponible"),
    priceUSD: basePrice,
    priceCDF: basePrice * EXCHANGE_RATE_CDF,
    stock: Number(p.stock ?? 10),
    image: cleanPath || "/media/placeholder.webp",
    mediaUrls: cleanPath ? [cleanPath] : [],
    category: String(p.category || "femme"),
  };
}

function mapDbProduct(p: {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  category: { slug: string } | null;
  variants: { sku: string }[];
}): Product {
  const priceUSD = Math.round(p.basePrice / 100);
  const image = p.images[0] ?? "/media/placeholder.webp";

  return {
    id: p.variants[0]?.sku ?? p.id,
    name: p.name,
    description: p.description,
    priceUSD,
    priceCDF: priceUSD * EXCHANGE_RATE_CDF,
    stock: 10,
    image,
    mediaUrls: p.images.length ? p.images : [image],
    category: p.category?.slug ?? "femme",
  };
}

function getProductsFromJson(): Product[] {
  return Object.values(productData.products)
    .flat()
    .map((p) => mapJsonProduct(p as unknown as Record<string, unknown>));
}

export const getAllProducts = cache(async (): Promise<Product[]> => {
  try {
    const dbProducts = await prisma.product.findMany({
      where: { isArchived: false },
      include: {
        category: { select: { slug: true } },
        variants: { select: { sku: true }, take: 1 },
        images: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbProducts.length > 0) {
      return dbProducts.map(mapDbProduct);
    }
  } catch (error) {
    console.warn("[getAllProducts] Fallback JSON:", error);
  }

  return getProductsFromJson();
});

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const byVariant = await prisma.productVariant.findFirst({
      where: { OR: [{ sku: id }, { id }] },
      include: {
        product: {
          include: {
            category: { select: { slug: true } },
            variants: { select: { sku: true }, take: 1 },
            images: true,
          },
        },
      },
    });

    if (byVariant?.product) {
      return mapDbProduct(byVariant.product);
    }

    const byProduct = await prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        isArchived: false,
      },
      include: {
        category: { select: { slug: true } },
        variants: { select: { sku: true }, take: 1 },
        images: true,
      },
    });

    if (byProduct) {
      return mapDbProduct(byProduct);
    }
  } catch (error) {
    console.warn("[getProductById] Fallback JSON:", error);
  }

  const jsonProduct = getProductsFromJson().find((p) => p.id === id);
  return jsonProduct ?? null;
}
