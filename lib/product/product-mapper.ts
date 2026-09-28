// lib/product/product-mapper.ts

import type { Prisma, Product, ProductVariant, VariantStock, ProductPrice, ProductImage, Category, Tag } from "@prisma/client";
import { toCents } from "@/lib/product-pricing/pricing.service";
import type { ProductListItem, ProductDetails } from "@/lib/product/product-types";

type ProductRow = Product & {
  productType?: { type: string } | null;
  productPrices?: ProductPrice[];
  variants?: (ProductVariant & { variantStocks?: VariantStock[] })[];
  productImages?: ProductImage[];
  category?: Pick<Category, "id" | "name"> | null;
  productTags?: { tag: Pick<Tag, "id" | "name" | "slug"> }[];
  _count?: { productImages: number; variants: number; catalogs: number; productTags: number };
  stock?: { quantity: number; reserved: number } | null;
  availabilityProjection?: { isAvailable: boolean } | null;
};

export function mapProductToListItem(row: ProductRow): ProductListItem {
  const basePriceCents = row.basePrice ? toCents(row.basePrice) : 0;
  const comparePriceCents = row.price ? toCents(row.price) : null;
  const quantity = row.stock?.quantity ?? 0;
  const reserved = row.stock?.reserved ?? 0;

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    productType: row.productType?.type ?? null,
    basePriceCents,
    comparePriceCents,
    currency: row.currency,
    status: row.status,
    isFeatured: row.isFeatured,
    isArchived: row.isArchived,
    isActive: row.isActive,
    imageCount: row._count?.productImages ?? row.productImages?.length ?? 0,
    variantCount: row._count?.variants ?? row.variants?.length ?? 0,
    quantity,
    reserved,
    available: Math.max(0, quantity - reserved),
    isAvailableProjection: row.availabilityProjection?.isAvailable ?? false,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    catalogCount: row._count?.catalogs ?? 0,
    tagCount: row._count?.productTags ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
