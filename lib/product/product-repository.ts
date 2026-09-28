import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProductToListItem } from "./product-mapper";
import type { ProductQuery, ProductListResult, ProductKpis } from "./product-types";
import { STOCK_THRESHOLDS } from "./product-constant";

function buildProductWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  and.push({ isdeleted: query.deleted === true });
  if (query.archived !== undefined) and.push({ isArchived: query.archived });
  if (query.status?.length) and.push({ status: { in: query.status } });
  if (query.productType) and.push({ productType: { is: { type: query.productType } } });
  if (query.categoryId) and.push({ OR: [
    { categoryId: query.categoryId },
    { categoryProducts: { some: { categoryId: query.categoryId } } },
  ] });

  if (query.search) {
    and.push({
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  if (query.currency) and.push({ currency: query.currency });
  if (query.featured !== undefined) and.push({ isFeatured: query.featured });
  if (query.catalogId) and.push({ catalogs: { some: { catalogId: query.catalogId } } });
  if (query.createdBy) and.push({ createdBy: query.createdBy });
  if (query.createdFrom || query.createdTo) {
    and.push({ createdAt: { gte: query.createdFrom, lte: query.createdTo } });
  }

   if (query.priceMinCents !== undefined || query.priceMaxCents !== undefined) {
    and.push({
      productPrice: {
        some: {
          amount: {
            gte: query.priceMinCents !== undefined ? query.priceMinCents / 100 : undefined,
            lte: query.priceMaxCents !== undefined ? query.priceMaxCents / 100 : undefined,
          },
        },
      },
    });
  }

  if (query.stockState) {
    switch (query.stockState) {
      case "OUT_OF_STOCK":
        and.push({ availabilityProjection: { isAvailable: false } });
        break;
      case "IN_STOCK":
        and.push({ availabilityProjection: { isAvailable: true } });
        break;
      case "LOW_STOCK":
        and.push({ stock: { quantity: { lte: STOCK_THRESHOLDS.LOW_STOCK, gt: 0 } } });
        break;
    }
  }

return and.length ? { AND: and } : {};
}

export async function getProductList(query: ProductQuery): Promise<ProductListResult> {
  const limit = Math.min(Math.max(query.limit ?? 25, 1), 100);
  const where = buildProductWhere(query);

  const rows = await prisma.product.findMany({
    where,
    take: limit + 1,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    skip: query.cursor ? 1 : 0,
    orderBy: [{ [query.orderBy ?? "createdAt"]: query.orderDir ?? "desc" }, { id: "asc" }],
    include: {
      productType: { select: { type: true } },
      productPrice: { take: 1, orderBy: { startsAt: "desc" } },
      category: { select: { id: true, name: true } },
      stock: { select: { quantity: true, reserved: true } },
      availabilityProjection: { select: { isAvailable: true } },
      _count: {
        select: { productImages: true, variants: true, catalogs: true, productTags: true },
      },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const items = page.map((row) => mapProductToListItem(row));
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
 const baseWhere = { isdeleted: false };
 const [total, published, drafts, pending, scheduled, archived, deleted, outOfStock, lowStock] =
  await Promise.all([
    prisma.product.count({ where: baseWhere }),
    prisma.product.count({ where: { ...baseWhere, status: ProductStatus.PUBLISHED } }),
    prisma.product.count({ where: { ...baseWhere, status: ProductStatus.DRAFT } }),
    prisma.product.count({ where: { ...baseWhere, status: ProductStatus.PENDING } }),
    prisma.product.count({ where: { ...baseWhere, status: ProductStatus.SCHEDULED } }),
    prisma.product.count({ where: { ...baseWhere, isArchived: true } }),
    prisma.product.count({ where: { isdeleted: true } }),
    prisma.product.count({ where: { ...baseWhere, availabilityProjection: { isAvailable: false } } }),
    prisma.product.count({ where: { ...baseWhere, stock: { quantity: { lte: STOCK_THRESHOLDS.LOW_STOCK, gt: 0 } } } }),
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
    lowStock,
  };
}
