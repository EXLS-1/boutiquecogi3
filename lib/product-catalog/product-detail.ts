/**
 * =============================================================================
 * PRODUCT DETAIL TYPES & MAPPER — Boutiquecogi3
 * =============================================================================
 * Types et mapper pour la page produit détaillée.
 * Inclut toutes les données : variantes, stock, images, options, tags,
 * attributs, avis, prix régionaux, coupon, taxe.
 */

import type { ProductStatus, AvailabilityStatus } from "./catalog-types";
import { AVAILABILITY_STATUS, serializeDecimal } from "./catalog-types";

// ═════════════════════════════════════════════════════════════════════════════
// TYPES BRUTS (alignés sur les includes Prisma)
// ═════════════════════════════════════════════════════════════════════════════

export interface ProductDetailStock {
  readonly id: string;
  readonly quantity: number;
  readonly reserved: number;
  readonly alertThreshold: number;
  readonly warehouse: string | null;
  readonly lastMovementAt: Date;
  readonly updatedAt: Date;
}

export interface ProductDetailVariant {
  readonly id: string;
  readonly sku: string;
  readonly attributes: Record<string, unknown> | null;
  readonly priceOffset: number;
  readonly createdAt: Date;
}

export interface ProductDetailImage {
  readonly id: string;
  readonly url: string;
  readonly alt: string | null;
  readonly position: number;
}

export interface ProductDetailOption {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

export interface ProductDetailTag {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface ProductDetailAttribute {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly value: string;
}

export interface ProductDetailReview {
  readonly id: string;
  readonly rating: number;
  readonly comment: string | null;
  readonly isVerifiedPurchase: boolean;
  readonly createdAt: Date;
  readonly userName: string | null;
  readonly userImage: string | null;
}

export interface ProductDetailPrice {
  readonly id: string;
  readonly currency: string;
  readonly amount: number;
  readonly compareAtPrice: number | null;
  readonly country: string | null;
  readonly region: string | null;
  readonly startsAt: Date | null;
  readonly endsAt: Date | null;
}

export interface ProductDetailCoupon {
  readonly id: string;
  readonly code: string;
  readonly discountType: string;
  readonly discountValue: number;
  readonly minOrderValue: number | null;
  readonly expiresAt: Date;
  readonly isActive: boolean;
}

export interface ProductDetailTaxClass {
  readonly id: string;
  readonly name: string;
  readonly rate: number;
}

export interface ProductDetailCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
}

export interface ProductDetailAvailability {
  readonly isAvailable: boolean;
  readonly updatedAt: Date;
}

// ═════════════════════════════════════════════════════════════════════════════
// TYPE COMPLET PRODUIT DÉTAILLÉ
// ═════════════════════════════════════════════════════════════════════════════

export interface ProductDetailData {
  // Champs de base
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly slug: string;
  readonly description: string | null;
  readonly price: number;
  readonly basePrice: number;
  readonly currency: string;
  readonly status: ProductStatus;
  readonly videoUrl: string | null;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly salePrice: number | null;
  readonly saleStart: Date | null;
  readonly saleEnd: Date | null;
  readonly soldCount: number;
  readonly isFeatured: boolean;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  // Images simples (tableau String[])
  readonly images: readonly string[];

  // Relations
  readonly category: ProductDetailCategory | null;
  readonly stock: ProductDetailStock | null;
  readonly availabilityProjection: ProductDetailAvailability | null;
  readonly variants: readonly ProductDetailVariant[];
  readonly productImages: readonly ProductDetailImage[];
  readonly productOptions: readonly ProductDetailOption[];
  readonly tags: readonly ProductDetailTag[];
  readonly attributes: readonly ProductDetailAttribute[];
  readonly reviews: readonly ProductDetailReview[];
  readonly prices: readonly ProductDetailPrice[];
  readonly coupon: ProductDetailCoupon | null;
  readonly taxClass: ProductDetailTaxClass | null;

  // Computed
  readonly availabilityStatus: AvailabilityStatus;
  readonly totalStock: number;
  readonly availableStock: number;
  readonly averageRating: number;
  readonly reviewCount: number;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAPPER — Prisma raw → ProductDetailData
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Map un produit brut Prisma (avec toutes les relations incluses)
 * vers le type ProductDetailData complet.
 */
export function mapProductDetail(raw: {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description: string | null;
  price: unknown;
  basePrice: unknown;
  currency: string;
  status: ProductStatus;
  videoUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  salePrice: number | null;
  saleStart: Date | null;
  saleEnd: Date | null;
  soldCount: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  } | null;
  stock: {
    id: string;
    quantity: number;
    reserved: number;
    alertThreshold: number;
    warehouse: string | null;
    lastMovementAt: Date;
    updatedAt: Date;
  } | null;
  availabilityProjection: {
    isAvailable: boolean;
    updatedAt: Date;
  } | null;
  variants: Array<{
    id: string;
    sku: string;
    attributes: unknown;
    priceOffset: number;
    createdAt: Date;
  }>;
  productImages: Array<{
    id: string;
    url: string;
    alt: string | null;
    position: number;
  }>;
  productOptions: Array<{
    id: string;
    name: string;
    value: string;
  }>;
  productTags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  productAttributeValues: Array<{
    id: string;
    value: string;
    attribute: {
      id: string;
      name: string;
      type: string;
    };
  }>;
  productReviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    isVerifiedPurchase: boolean;
    createdAt: Date;
    user: {
      name: string | null;
      image: string | null;
    };
  }>;
  productPrices: Array<{
    id: string;
    currency: string;
    amount: number;
    compareAtPrice: number | null;
    country: string | null;
    region: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
  }>;
  coupon: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    minOrderValue: number | null;
    expiresAt: Date;
    isActive: boolean;
  } | null;
  taxClass: {
    id: string;
    name: string;
    rate: number;
  } | null;
}): ProductDetailData {
  // ─── Stock ─────────────────────────────────────────────────────────────────
  const stock = raw.stock
    ? {
        id: raw.stock.id,
        quantity: raw.stock.quantity,
        reserved: raw.stock.reserved,
        alertThreshold: raw.stock.alertThreshold,
        warehouse: raw.stock.warehouse,
        lastMovementAt: raw.stock.lastMovementAt,
        updatedAt: raw.stock.updatedAt,
      }
    : null;

  const totalStock = stock?.quantity ?? 0;
  const availableStock = stock ? stock.quantity - stock.reserved : 0;

  // ─── Disponibilité ─────────────────────────────────────────────────────────
  const isAvailable = raw.availabilityProjection?.isAvailable ?? false;
  const availabilityStatus = isAvailable
    ? availableStock > 0
      ? AVAILABILITY_STATUS.IN_STOCK
      : AVAILABILITY_STATUS.PRE_ORDER
    : AVAILABILITY_STATUS.OUT_OF_STOCK;

  // ─── Variantes ──────────────────────────────────────────────────────────────
  const variants = raw.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    attributes: v.attributes as Record<string, unknown> | null,
    priceOffset: v.priceOffset,
    createdAt: v.createdAt,
  }));

  // ─── Images ─────────────────────────────────────────────────────────────────
  const productImages = raw.productImages.map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt,
    position: img.position,
  }));

  // ─── Options ────────────────────────────────────────────────────────────────
  const productOptions = raw.productOptions.map((opt) => ({
    id: opt.id,
    name: opt.name,
    value: opt.value,
  }));

  // ─── Tags ───────────────────────────────────────────────────────────────────
  const tags = raw.productTags.map((pt) => ({
    id: pt.tag.id,
    name: pt.tag.name,
    slug: pt.tag.slug,
  }));

  // ─── Attributs ──────────────────────────────────────────────────────────────
  const attributes = raw.productAttributeValues.map((av) => ({
    id: av.id,
    name: av.attribute.name,
    type: av.attribute.type,
    value: av.value,
  }));
  // ─── Avis ───────────────────────────────────────────────────────────────────
  const reviews = raw.productReviews.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    isVerifiedPurchase: r.isVerifiedPurchase,
    createdAt: r.createdAt,
    userName: r.user.name,
    userImage: r.user.image,
  }));

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  // ─── Prix régionaux ─────────────────────────────────────────────────────────
  const prices = raw.productPrices.map((p) => ({
    id: p.id,
    currency: p.currency,
    amount: p.amount,
    compareAtPrice: p.compareAtPrice,
    country: p.country,
    region: p.region,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  }));

  // ─── Coupon ─────────────────────────────────────────────────────────────────
  const coupon = raw.coupon
    ? {
        id: raw.coupon.id,
        code: raw.coupon.code,
        discountType: raw.coupon.discountType,
        discountValue: raw.coupon.discountValue,
        minOrderValue: raw.coupon.minOrderValue,
        expiresAt: raw.coupon.expiresAt,
        isActive: raw.coupon.isActive,
      }
    : null;

  // ─── Taxe ───────────────────────────────────────────────────────────────────
  const taxClass = raw.taxClass
    ? {
        id: raw.taxClass.id,
        name: raw.taxClass.name,
        rate: raw.taxClass.rate,
      }
    : null;

  // ─── Catégorie ──────────────────────────────────────────────────────────────
  const category = raw.category
    ? {
        id: raw.category.id,
        name: raw.category.name,
        slug: raw.category.slug,
        description: raw.category.description,
      }
    : null;

  return Object.freeze({
    id: raw.id,
    name: raw.name,
    sku: raw.sku,
    slug: raw.slug,
    description: raw.description,
    price: serializeDecimal(raw.price),
    basePrice: serializeDecimal(raw.basePrice),
    currency: raw.currency,
    status: raw.status,
    videoUrl: raw.videoUrl,
    seoTitle: raw.seoTitle,
    seoDescription: raw.seoDescription,
    salePrice: raw.salePrice,
    saleStart: raw.saleStart,
    saleEnd: raw.saleEnd,
    soldCount: raw.soldCount,
    isFeatured: raw.isFeatured,
    isActive: raw.isActive,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    images: raw.images ?? [],
    category,
    stock,
    availabilityProjection: raw.availabilityProjection
      ? {
          isAvailable: raw.availabilityProjection.isAvailable,
          updatedAt: raw.availabilityProjection.updatedAt,
        }
      : null,
    variants,
    productImages,
    productOptions,
    tags,
    attributes,
    reviews,
    prices,
    coupon,
    taxClass,
    availabilityStatus,
    totalStock,
    availableStock,
    averageRating,
    reviewCount,
  });
}
