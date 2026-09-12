// lib/products/product.mapper.ts
// =============================================================================
// PRODUCT MAPPER — Conversion Prisma → DTO domaine
// =============================================================================
// Renvoie JAMAIS un Prisma.Product brut dans une page React.
// Tous les Decimal → number, bigint → string, relations aplaties.
//

import { toCents } from "@/lib/product-pricing/pricing.service";
import type { ProductListItem, ProductDetails } from "./types";

export function mapProductToListItem(row: any): ProductListItem {
  const basePriceCents = row.basePrice ? toCents(row.basePrice) : 0;
  const comparePriceCents = row.productPrices?.[0]?.compareAtPrice ?? null;

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
    isFeatured: row.isFeatured ?? false,
    isArchived: row.isArchived ?? false,
    isActive: row.isActive ?? false,
    imageCount: row._count?.productImages ?? row.productImages?.length ?? 0,
    variantCount: row._count?.variantStocks ?? row.variants?.length ?? 0,
    quantity: row.stock?.quantity ?? 0,
    reserved: row.stock?.reserved ?? 0,
    available: (row.stock?.quantity ?? 0) - (row.stock?.reserved ?? 0),
    isAvailableProjection: row.availabilityProjection?.isAvailable ?? false,
    categoryId: row.category?.id ?? row.categoryId ?? null,
    categoryName: row.category?.name ?? null,
    catalogCount: row._count?.catalogs ?? row.catalogs?.length ?? 0,
    tagCount: row._count?.productTags ?? row.productTags?.length ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapProductToDetails(row: any): ProductDetails {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    description: row.description,
    basePrice: row.basePrice ? toCents(row.basePrice) : 0,
    price: row.price ? toCents(row.price) : null,
    currency: row.currency,
    status: row.status,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    isDeleted: row.isdeleted,
    deletedAt: row.deletedAt,
    scheduledAt: row.scheduledAt,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    productType: row.productType ? {
      id: row.productType.id,
      type: row.productType.type,
      label: row.productType.label,
      maxVariants: row.productType.maxVariants,
      requiresApproval: row.productType.requiresApproval,
    } : null,
    variants: (row.variants ?? []).map((v: any) => ({
      id: v.id,
      sku: v.sku,
      attributes: v.attributes,
      priceOffset: v.priceOffset,
      isActive: v.isActive,
      stock: (v.variantStocks ?? []).map((vs: any) => ({
        id: vs.id,
        quantity: vs.quantity,
        reserved: vs.reserved,
        available: vs.quantity - vs.reserved,
        alertThreshold: vs.alertThreshold,
        warehouseId: vs.warehouseId,
      })),
    })),
    prices: (row.productPrices ?? []).map((p: any) => ({
      id: p.id,
      currency: p.currency,
      amount: p.amount,
      compareAtPrice: p.compareAtPrice,
      country: p.country,
      region: p.region,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
    })),
    images: (row.productImages ?? []).map((img: any) => ({
      id: img.id,
      url: img.url,
      alt: img.alt,
      position: img.position,
    })),
    tags: (row.productTags ?? []).map((pt: any) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
    })),
    categories: (row.categoryProducts ?? []).map((cp: any) => ({
      id: cp.category.id,
      name: cp.category.name,
      slug: cp.category.slug,
      displayOrder: cp.displayOrder,
    })),
    catalogs: (row.catalogs ?? []).map((cp: any) => ({
      id: cp.catalog.id,
      name: cp.catalog.name,
      priceOverride: cp.priceOverride,
      isActive: cp.isActive,
    })),
    attributes: (row.productAttributeValues ?? []).map((pa: any) => ({
      id: pa.id,
      attribute: pa.attribute.name,
      value: pa.value,
    })),
    options: (row.productOptions ?? []).map((po: any) => ({
      id: po.id,
      name: po.name,
      value: po.value,
    })),
    reviews: (row.productReviews ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      user: r.user ? { id: r.user.id, name: r.user.name } : null,
    })),
    statusHistory: (row.statusHistory ?? []).map((h: any) => ({
      id: h.id,
      oldStatus: h.oldStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      changedAt: h.changedAt,
      changedBy: h.changedBy ? { id: h.changedBy.id, name: h.changedBy.name } : null,
    })),
    availability: row.availabilityProjection?.isAvailable ?? false,
    stock: row.stock ? {
      quantity: row.stock.quantity,
      reserved: row.stock.reserved,
      available: row.stock.quantity - row.stock.reserved,
    } : null,
  };
}
