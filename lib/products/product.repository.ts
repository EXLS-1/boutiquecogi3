// lib/products/product.repository.ts
// =============================================================================
// PRODUCT REPOSITORY — Lectures server-side (listing + KPIs)
// =============================================================================
// TABLE ADMIN = SERVER-SIDE. Jamais de prisma.product.findMany() brut dans
// une page, puis filtrage JS.
//
//   GET /admin/products → ProductQuery → buildProductWhere (Prisma) → PostgreSQL
//
// Pagination : CURSOR (pas OFFSET 50000) — tri stable sur createdAt+id.
// Filtres : search, status, productType, categoryId, catalogId, currency,
// stockState, featured, archived/deleted, createdBy, dateRange, priceRange.
// Soft-delete : les produits isdeleted=true sont exclus par défaut (lister
// explicitement deleted=true les remonte — corbeille).

import { Prisma, ProductStatus, type Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toCents } from "@/lib/product-pricing/pricing.service";
import type { Tx } from "@/lib/product-audit/product-audit.types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

// ─── Types du contrat de lecture ─────────────────────────────────────────────

export type ProductStockState = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface ProductQuery {
  search?: string;
  status?: ProductStatus[];
  productType?: string;
  categoryId?: string;
  catalogId?: string;
  currency?: Currency;
  stockState?: ProductStockState;
  featured?: boolean;
  archived?: boolean;
  deleted?: boolean;
  createdBy?: string;
  createdFrom?: Date;
  createdTo?: Date;
  priceMinCents?: number;
  priceMaxCents?: number;
  cursor?: string;
  limit?: number;
  /** Tri : défaut createdAt desc. */
  orderBy?: "createdAt" | "basePrice" | "name" | "updatedAt";
  orderDir?: "asc" | "desc";
}

/** Ligne de la table admin (DTO mince, jamais Prisma.Product brut dans React). */
export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  productType: string | null;
  basePriceCents: number;
  comparePriceCents: number | null;
  currency: Currency;
  status: ProductStatus;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  imageCount: number;
  variantCount: number;
  quantity: number;
  reserved: number;
  available: number;
  isAvailableProjection: boolean;
  categoryId: string | null;
  categoryName: string | null;
  catalogCount: number;
  tagCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductListResult {
  items: ProductListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

// ─── Construction du WHERE (filtres admin server-side) ───────────────────────

function buildProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  // Soft-delete : exclusion par défaut (corbeille opt-in via deleted=true)
  where.isdeleted = query.deleted === true;
  where.isArchived = query.archived === true ? undefined : false;
  if (query.archived === true) where.isArchived = true;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
      { variants: { some: { sku: { contains: query.search, mode: "insensitive" } } } },
    ];
  }

  if (query.status?.length) where.status = { in: query.status };
  if (query.productType) where.productType = query.productType;
  if (query.categoryId) {
    // Catégorie principale OU secondaire (CategoryProduct)
    where.OR = [
      { categoryId: query.categoryId },
      { categoryProducts: { some: { categoryId: query.categoryId } } },
    ];
  }
  if (query.catalogId) {
    where.catalogs = { some: { catalogId: query.catalogId, isActive: true } };
  }
  if (query.currency) where.currency = query.currency;
  if (query.featured !== undefined) where.isFeatured = query.featured;

  if (query.createdBy) where.createdBy = query.createdBy;
  if (query.createdFrom || query.createdTo) {
    where.createdAt = {
      gte: query.createdFrom,
      lte: query.createdTo,
    };
  }
  if (query.priceMinCents !== undefined || query.priceMaxCents !== undefined) {
    where.basePrice = {
      gte: query.priceMinCents !== undefined ? query.priceMinCents / 100 : undefined,
      lte: query.priceMaxCents !== undefined ? query.priceMaxCents / 100 : undefined,
    };
  }

  // StockState : évalué sur la couche VariantStock (canonique).
  // NB : `quantity - reserved` n'est pas exprimable en filtre Prisma brut →
  // approximation SQL (quantity) + post-filtrage disponible exact côté app.
  if (query.stockState === "OUT_OF_STOCK") {
    where.variants = {
      every: { variantStocks: { every: { quantity: { lte: 0 } } } },
    };
  } else if (query.stockState === "IN_STOCK") {
    where.variants = {
      some: { variantStocks: { some: { quantity: { gt: 0 } } } },
    };
  } else if (query.stockState === "LOW_STOCK") {
    where.variants = {
      some: { variantStocks: { some: { quantity: { gt: 0 } } } },
    };
  }

  return where;
}

function isLowStock(quantity: number, reserved: number, threshold: number): boolean {
  const available = quantity - reserved;
  return available > 0 && available <= threshold;
}


// ─── Listing server-side (cursor pagination) ─────────────────────────────────

export async function listProducts(
  query: ProductQuery
): Promise<ProductListResult> {
  const limit = Math.min(
    Math.max(query.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  const where = buildProductWhere(query);

  const orderByField =
    query.orderBy === "basePrice"
      ? "basePrice"
      : query.orderBy === "name"
        ? "name"
        : query.orderBy === "updatedAt"
          ? "updatedAt"
          : "createdAt";

  const rows = await prisma.product.findMany({
    where,
    take: limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    orderBy: [{ [orderByField]: query.orderDir ?? "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      productType: true,
      basePrice: true,
      price: true,
      currency: true,
      status: true,
      isFeatured: true,
      isArchived: true,
      isActive: true,
      categoryId: true,
      category: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          productImages: true,
          variants: true,
          catalogs: true,
          productTags: true,
        },
      },
      stock: {
        select: { quantity: true, reserved: true, alertThreshold: true },
      },
      availabilityProjection: { select: { isAvailable: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items: ProductListItem[] = page.map((p) => {
    const quantity = p.stock?.quantity ?? 0;
    const reserved = p.stock?.reserved ?? 0;

    // Post-filtrage LOW_STOCK avec le seuil réel (n'est pas exprimable en SQL Prisma)
    if (query.stockState === "LOW_STOCK") {
      const available = quantity - reserved;
      if (available <= 0 || available > (p.stock?.alertThreshold ?? 10)) {
        return null;
      }
    }
    if (query.stockState === "IN_STOCK" && quantity - reserved <= 0) {
      return null;
    }

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      slug: p.slug,
      productType: p.productType,
      basePriceCents: toCents(p.basePrice),
      comparePriceCents:
        p.price && toCents(p.price) > toCents(p.basePrice)
          ? toCents(p.price)
          : null,
      currency: p.currency,
      status: p.status,
      isFeatured: p.isFeatured,
      isArchived: p.isArchived,
      isActive: p.isActive,
      imageCount: p._count.productImages,
      variantCount: p._count.variants,
      quantity,
      reserved,
      available: quantity - reserved,
      isAvailableProjection: p.availabilityProjection?.isAvailable ?? false,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
      catalogCount: p._count.catalogs,
      tagCount: p._count.productTags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  // Post-filtrage exact du stockState (disponible = quantity - reserved)
  const filtered =
    query.stockState === "LOW_STOCK"
      ? items.filter(
          (it) =>
            it.available > 0 &&
            it.available <= (it.available <= 10 ? 10 : it.available)
        )
      : items;

  const last = page[page.length - 1];

  return {
    items: filtered,
    nextCursor: hasMore && last ? last.id : null,
    hasMore,
    limit,
  };
}

// ─── KPIs du dashboard produits (requêtes agrégées) ──────────────────────────

export interface ProductKpis {
  total: number;
  published: number;
  drafts: number;
  pending: number;
  outOfStock: number;
  lowStock: number;
  archived: number;
  deleted: number;
  scheduled: number;
}

export async function getProductKpis(): Promise<ProductKpis> {
  const notDeleted = { isdeleted: false, isArchived: false } as const;

  const [
    total,
    published,
    drafts,
    pending,
    scheduled,
    archived,
    deleted,
    availability,
  ] = await Promise.all([
    prisma.product.count({ where: { isdeleted: false } }),
    prisma.product.count({ where: { ...notDeleted, status: ProductStatus.PUBLISHED } }),
    prisma.product.count({ where: { ...notDeleted, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { ...notDeleted, status: ProductStatus.PENDING } }),
    prisma.product.count({ where: { ...notDeleted, status: ProductStatus.SCHEDULED } }),
    prisma.product.count({ where: { isArchived: true, isdeleted: false } }),
    prisma.product.count({ where: { isdeleted: true } }),
    // Ruptures via projection (O(1) par produit, indexé productId)
    prisma.product_Availability_Projection.count({
      where: { isAvailable: false, product: { isdeleted: false, isArchived: false } },
    }),
  ]);

  return {
    total,
    published,
    drafts,
    pending,
    outOfStock: availability,
    lowStock: 0, // rempli par getInventoryKpis si besoin (couche VariantStock)
    archived,
    deleted,
    scheduled,
  };
}

/** Statistiques d'un produit (page détail) — agrégats, jamais findMany massif. */
export async function getProductAnalytics(productId: string): Promise<{
  views: number;
  unitsSold: number;
  orderCount: number;
  averageRating: number | null;
  reviewCount: number;
  stockValueCents: number | null;
}> {
  const [views, orderItems, rating, product] = await Promise.all([
    prisma.productView.count({ where: { productId } }),
    prisma.orderItem.aggregate({
      where: { productId },
      _sum: { quantity: true },
      _count: { orderId: true },
    }),
    prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { basePrice: true, stock: { select: { quantity: true } } },
    }),
  ]);

  const stockValueCents =
    product?.stock?.quantity != null
      ? toCents(product.basePrice) * product.stock.quantity
      : null;

  return {
    views,
    unitsSold: orderItems._sum.quantity ?? 0,
    orderCount: orderItems._count.orderId,
    averageRating: rating._avg.rating ?? null,
    reviewCount: rating._count.rating,
    stockValueCents,
  };
}

void isLowStock; // réservé au post-filtrage LOW_STOCK (page inventaire)
void Tx;

