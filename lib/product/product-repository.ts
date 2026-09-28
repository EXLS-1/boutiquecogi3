import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProductToListItem } from "./product-mapper";
import type { ProductQuery, ProductListResult, ProductKpis } from "./product-types";

function buildProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  where.isdeleted = query.deleted === true;
  if (query.archived !== undefined) where.isArchived = query.archived;

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { sku: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.status?.length) where.status = { in: query.status };
  if (query.productType) where.productType = { is: { type: query.productType } };
  if (query.categoryId) {
    where.OR = [
      { categoryId: query.categoryId },
      { categoryProducts: { some: { categoryId: query.categoryId } } },
    ];
  }
  if (query.currency) where.currency = query.currency;
  if (query.featured !== undefined) where.isFeatured = query.featured;

  if (query.priceMinCents !== undefined || query.priceMaxCents !== undefined) {
    where.productPrices = {
      some: {
        amount: {
          gte: query.priceMinCents !== undefined ? query.priceMinCents / 100 : undefined,
          lte: query.priceMaxCents !== undefined ? query.priceMaxCents / 100 : undefined,
        },
      },
    };
  }

  return where;
}

export async function getProductList(query: ProductQuery): Promise<ProductListResult> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
  const where = buildProductWhere(query);

  const rows = await prisma.product.findMany({
    where,
    take: limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    orderBy: [{ createdAt: query.orderDir ?? "desc" }, { id: "asc" }],
    include: {
      productType: { select: { type: true } },
      category: { select: { name: true } },
      stock: { select: { quantity: true, reserved: true } },
      availabilityProjection: { select: { isAvailable: true } },
      _count: {
        select: { productImages: true, variants: true, catalogs: true, productTags: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map((row) => mapProductToListItem(row as any));
  const total = await prisma.product.count({ where });

  return {
    items,
    nextCursor: hasMore && page.length > 0 ? page[page.length - 1].id : null,
    hasMore,
    limit,
    total,
  };
}

export async function getProductKpis(): Promise<ProductKpis> {
  const [total, published, drafts, pending, scheduled, archived, deleted, outOfStock] = await Promise.all([
    prisma.product.count({ where: { isdeleted: false } }),
    prisma.product.count({ where: { isdeleted: false, status: ProductStatus.PUBLISHED } }),
    prisma.product.count({ where: { isdeleted: false, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { isdeleted: false, status: ProductStatus.PENDING } }),
    prisma.product.count({ where: { isdeleted: false, status: ProductStatus.SCHEDULED } }),
    prisma.product.count({ where: { isdeleted: false, isArchived: true } }),
    prisma.product.count({ where: { isdeleted: true } }),
    prisma.product_Availability_Projection.count({ where: { isAvailable: false } }),
  ]);

  return {
    total,
    published,
    drafts,
    pending,
    scheduled,
    archived,
    deleted,
    outOfStock,
    lowStock: 0,
  };
}