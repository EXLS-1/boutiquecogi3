// lib/product/product-mapper.ts

import { Prisma, type ProductStatus, type Currency } from "@prisma/client";
import { toCents } from "@/lib/product-pricing/pricing.service";
import type { ProductListItem } from "@/lib/product/product-types";
import type {
  ProductDetails,
  ProductDetailsPrice,
  ProductDetailsVariant,
} from "@/lib/product/types";

// ─────────────────────────────────────────────
// Ligne d'entrée tolérante (tests + Prisma réel)
// ─────────────────────────────────────────────
// Le schéma réel a dérivé (colonnes Decimal legacy supprimées,
// relation `productPrice` au singulier côté pricing.service, …)
// tandis que les tests figent le contrat legacy. Cette interface
// accepte les deux formes : chaque relation est optionnelle et
// chaque montant accepte Decimal | number | string | null.

export type LegacyAmount = Prisma.Decimal | number | string | null | undefined;

export interface MapperPriceRow {
  id: string;
  currency: string;
  amount: number;
  compareAtPrice?: number | null;
  country?: string | null;
  region?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface MapperVariantStock {
  id: string;
  quantity: number;
  reserved: number;
  alertThreshold?: number | null;
  warehouseId?: string | null;
}

export interface ProductMapperRow {
  id: string;
  name: string;
  sku: string;
  slug: string;
  description?: string | null;
  basePrice?: LegacyAmount;
  price?: LegacyAmount;
  currency: Currency;
  status: ProductStatus;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  isdeleted?: boolean;
  categoryId?: string | null;
  deletedAt?: Date | null;
  scheduledAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  productType?: {
    id?: string;
    type: string;
    label?: string;
    maxVariants?: number;
    requiresApproval?: boolean;
  } | null;
  productPrice?: MapperPriceRow[] | null;
  productPrices?: MapperPriceRow[] | null;
  variants?: Array<{
    id: string;
    sku: string;
    attributes?: unknown;
    priceOffset?: number | null;
    isActive?: boolean;
    variantStocks?: MapperVariantStock[] | null;
  }> | null;
  productImages?: Array<{ id: string; url: string; alt?: string | null; position?: number | null }> | null;
  productTags?: Array<{ tag: { id: string; name: string; slug: string } }> | null;
  category?: { id?: string | null; name?: string | null } | null;
  catalogs?: Array<{
    priceOverride?: LegacyAmount;
    isActive?: boolean;
    catalog?: { id: string; name: string } | null;
  }> | null;
  categoryProducts?: Array<{
    category: { id: string; name: string; slug: string };
    displayOrder?: number | null;
  }> | null;
  productReviews?: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    isVerifiedPurchase?: boolean;
    createdAt: Date;
    user?: { id: string; name?: string | null } | null;
  }> | null;
  statusHistory?: Array<{
    id: string;
    oldStatus: ProductStatus;
    newStatus: ProductStatus;
    reason?: string | null;
    changedAt: Date;
    changedBy?: { id: string; name?: string | null } | null;
  }> | null;
  productAttributeValues?: unknown[] | null;
  productOptions?: unknown[] | null;
  _count?: { productImages?: number; variants?: number; catalogs?: number; productTags?: number } | null;
  stock?: { quantity: number; reserved: number } | null;
  availabilityProjection?: { isAvailable: boolean } | null;
}


// ─────────────────────────────────────────────
// Conversions robustes (zéro ≠ null, Decimal → cents)
// ─────────────────────────────────────────────

/** Decimal/number/string legacy → centimes. null reste null, zéro reste zéro. */
function legacyToCentsOrNull(value: LegacyAmount): number | null {
  if (value === null || value === undefined) return null;
  return toCents(value instanceof Prisma.Decimal ? value.toNumber() : value);
}

/** Variante non-nulle : absent/null → 0 (le prix de base n'est jamais null en aval). */
function legacyToCents(value: LegacyAmount): number {
  return legacyToCentsOrNull(value) ?? 0;
}

function allPrices(row: ProductMapperRow): MapperPriceRow[] {
  return [...(row.productPrices ?? []), ...(row.productPrice ?? [])];
}

/** Spécificité géo : une grille pays/région bat une grille globale. */
function geoSpecificity(price: MapperPriceRow): number {
  return Number(price.country != null) + Number(price.region != null);
}

/** Tri canonique : spécificité géo croissante puis devise (stable et déterministe). */
function comparePrices(a: MapperPriceRow, b: MapperPriceRow): number {
  return (
    geoSpecificity(a) - geoSpecificity(b) ||
    a.currency.localeCompare(b.currency) ||
    a.id.localeCompare(b.id)
  );
}

/** Prix de comparaison : uniquement la grille de base (ni planifiée ni géo). */
function pickBaseComparePrice(prices: MapperPriceRow[]): number | null {
  const base = prices.find(
    (price) => price.country == null && price.region == null && price.startsAt == null && price.endsAt == null,
  );
  // `??` — pas `||` : un compareAtPrice à 0 est une information métier à préserver.
  return base?.compareAtPrice ?? null;
}

function normaliseAttributes(attributes: unknown): Record<string, unknown> | null {
  if (typeof attributes !== "object" || attributes === null || Array.isArray(attributes)) return null;
  return attributes as Record<string, unknown>;
}

function mapVariantStock(stock: MapperVariantStock): ProductDetailsVariant["stock"][number] {
  const quantity = stock.quantity ?? 0;
  const reserved = stock.reserved ?? 0;
  return {
    id: stock.id, quantity, reserved,
    alertThreshold: stock.alertThreshold ?? 0,
    warehouseId: stock.warehouseId ?? null,
    available: Math.max(0, quantity - reserved),
  };
}

function mapVariants(row: ProductMapperRow): ProductDetailsVariant[] {
  return [...(row.variants ?? [])]
    .sort((a, b) => a.sku.localeCompare(b.sku))
    .map((variant) => ({
      id: variant.id, sku: variant.sku,
      attributes: normaliseAttributes(variant.attributes),
      priceOffset: variant.priceOffset ?? 0,
      isActive: variant.isActive ?? true,
      stock: (variant.variantStocks ?? []).map(mapVariantStock),
    }));
}

function mapPrices(row: ProductMapperRow): ProductDetailsPrice[] {
  return allPrices(row).map((p) => ({
    id: p.id, currency: p.currency, amount: p.amount ?? 0,
    compareAtPrice: p.compareAtPrice ?? null,
    country: p.country ?? null, region: p.region ?? null,
    startsAt: p.startsAt ?? null, endsAt: p.endsAt ?? null,
  })).sort(comparePrices);
}

export function mapProductToListItem(row: ProductMapperRow): ProductListItem {
  const quantity = row.stock?.quantity ?? 0;
  const reserved = row.stock?.reserved ?? 0;
  return {
    id: row.id, name: row.name, sku: row.sku, slug: row.slug,
    productType: row.productType?.type ?? null,
    basePriceCents: legacyToCents(row.basePrice),
    comparePriceCents: pickBaseComparePrice(allPrices(row)),
    currency: row.currency, status: row.status,
    isFeatured: row.isFeatured, isArchived: row.isArchived, isActive: row.isActive,
    imageCount: row._count?.productImages ?? row.productImages?.length ?? 0,
    variantCount: row._count?.variants ?? row.variants?.length ?? 0,
    quantity, reserved, available: Math.max(0, quantity - reserved),
    isAvailableProjection: row.availabilityProjection?.isAvailable ?? false,
    categoryId: row.categoryId ?? null, categoryName: row.category?.name ?? null,
    catalogCount: row._count?.catalogs ?? row.catalogs?.length ?? 0,
    tagCount: row._count?.productTags ?? row.productTags?.length ?? 0,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}
export function mapProductToDetails(row: ProductMapperRow): ProductDetails {
  const quantity = row.stock?.quantity ?? 0;
  const reserved = row.stock?.reserved ?? 0;
  const stock = row.stock ? { quantity, reserved, available: Math.max(0, quantity - reserved) } : null;
  return {
    id: row.id, name: row.name, sku: row.sku, slug: row.slug,
    description: row.description ?? null,
    basePrice: legacyToCents(row.basePrice),
    price: legacyToCentsOrNull(row.price),
    currency: row.currency, status: row.status,
    isFeatured: row.isFeatured, isArchived: row.isArchived, isActive: row.isActive,
    productType: row.productType ? {
      id: row.productType.id ?? row.id, type: row.productType.type,
      label: row.productType.label ?? row.productType.type,
      maxVariants: row.productType.maxVariants ?? 0,
      requiresApproval: row.productType.requiresApproval ?? false,
    } : null,
    variants: mapVariants(row), prices: mapPrices(row),
    images: (row.productImages ?? []).map((image) => ({
      id: image.id, url: image.url, alt: image.alt ?? null, position: image.position ?? 0,
    })),
    tags: (row.productTags ?? []).map((entry) => ({ ...entry.tag })),
    categories: [...(row.categoryProducts ?? [])]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((entry) => ({ ...entry.category })),
    catalogs: (row.catalogs ?? []).map((entry) => ({
      priceOverride: legacyToCentsOrNull(entry.priceOverride),
      isActive: entry.isActive ?? true,
      catalog: entry.catalog ?? { id: row.id, name: "" },
    })),
    attributes: row.productAttributeValues ? [...row.productAttributeValues] : [],
    options: row.productOptions ? [...row.productOptions] : [],
    reviews: (row.productReviews ?? []).map((review) => ({
      id: review.id, rating: review.rating, comment: review.comment ?? null,
      isVerifiedPurchase: review.isVerifiedPurchase ?? false, createdAt: review.createdAt,
      user: review.user ? { id: review.user.id, name: review.user.name ?? null } : null,
    })),
    statusHistory: (row.statusHistory ?? []).map((entry) => ({
      id: entry.id, oldStatus: entry.oldStatus, newStatus: entry.newStatus,
      reason: entry.reason ?? null, changedAt: entry.changedAt,
      changedBy: entry.changedBy ? { id: entry.changedBy.id, name: entry.changedBy.name ?? null } : null,
    })),
    stock,
    availability: row.availabilityProjection?.isAvailable ?? (stock ? stock.available > 0 : false),
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}


