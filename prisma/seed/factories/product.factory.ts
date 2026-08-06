// prisma/seed/factories/product.factory.ts
// ============================================
// GÉNÉRATEUR DE PRODUITS & MÉTADONNÉES SEO
// ============================================

import { ProductStatus } from "@prisma/client";
import { generateDeterministicUuidV7 } from "../utils/uuid";
import { makeSlug } from "../utils/slug";
import { usdToCents, usdCentsToCdf, centsToUsdString } from "../utils/currency";
import { productImages } from "../utils/image";
import { GeneratedVariant, buildVariantsBatch } from "./variant.factory";

export interface GeneratedProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string;
  price: string; // USD Decimal (string)
  basePrice: string; // Cents -> string
  currency: "USD";
  categoryId: string;
  userId: string;
  status: ProductStatus;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  images: string[];
  seoTitle: string;
  seoDescription: string;
  priceUSD: string;
  priceCDF: string;
  createdAt: Date;
  variants: GeneratedVariant[];
}

const PRODUCT_NAMES = [
  "Robe Élégante Florale",
  "Costume Classique Premium",
  "Robe de Soirée Pailletée",
  "Blouse Blanche Chic",
  "Pantalon Habillé Foncé",
  "Sac à Main Cuir",
  "Chaussures Talons Hauts",
  "Ceinture Cuir Marron",
  "Foulard en Soie",
  "Ensemble Coordonné",
] as const;

export interface BuildProductOptions {
  name?: string;
  categoryId: string;
  userId: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  baseUsd?: number;
  variantCount?: number;
}

/**
 * Construit un produit + ses variantes + ses images.
 * Déterministe : mêmes index -> mêmes IDs et prix.
 */
export function buildProductFactory(
  index: number,
  options: BuildProductOptions,
): GeneratedProduct {
  const productId = generateDeterministicUuidV7("product", index);
  const name = options.name ?? PRODUCT_NAMES[index % PRODUCT_NAMES.length];
  const slug = makeSlug(name, index);
  const sku = `PROD-${String(index + 1).padStart(5, "0")}`;

  const baseUsd = options.baseUsd ?? 25 + (index % 40) * 5;
  const usdCents = usdToCents(baseUsd);
  const cdf = usdCentsToCdf(usdCents);

  const variants = buildVariantsBatch(
    index,
    productId,
    usdCents,
    options.variantCount ?? 2,
  );

  return {
    id: productId,
    name,
    sku,
    slug,
    description: `Description professionnelle détaillée pour "${name}". Conçu pour le marché congolais avec une haute durabilité.`,
    price: centsToUsdString(usdCents),
    basePrice: String(usdCents),
    currency: "USD",
    categoryId: options.categoryId,
    userId: options.userId,
    status: options.status ?? ProductStatus.PUBLISHED,
    isFeatured: options.isFeatured ?? index % 5 === 0,
    isArchived: false,
    isActive: true,
    images: productImages(index),
    seoTitle: name,
    seoDescription: `Achetez ${name} au meilleur prix. Livraison rapide à Kinshasa.`,
    priceUSD: centsToUsdString(usdCents),
    priceCDF: String(cdf),
    createdAt: new Date(Date.now() - index * 86400000),
    variants,
  };
}

/** Construit un lot de produits pour une catégorie donnée. */
export function buildProductsBatch(
  startIndex: number,
  count: number,
  categoryId: string,
  userId: string,
): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];
  for (let i = 0; i < count; i++) {
    products.push(buildProductFactory(startIndex + i, { categoryId, userId }));
  }
  return products;
}
