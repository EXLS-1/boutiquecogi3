// lib/security/product.ts
/**
 * =============================================================================
 * BOUTIQUECOGI3 — SECURE PRODUCT CATALOG SYSTEM
 * =============================================================================
 *
 * Architecture: Modular, Atomic, Cache-Optimized, RBAC-Aware
 * Stack: Prisma + Zod + React Cache + Audit Logging + Rate Limit Stub
 *
 * Security:
 * - All inputs validated via Zod
 * - Audit logging for admin mutations
 * - RBAC checks on write operations
 * - PII-safe logging
 *
 * Performance:
 * - React cache for read operations
 * - Prisma select optimization
 * - Fallback JSON for resilience
 * =============================================================================
 */

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { productData } from "@/data/product-data";
import type { RBACLevel } from "@/lib/security/audit";
import type { Product } from "@/types/products";

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_USD_TO_CDF_RATE as EXCHANGE_RATE_CDF } from "@/lib/currency/exchange-rate-constants";

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMAS (Input Validation & Type Safety)
// ─────────────────────────────────────────────────────────────────────────────

const ProductIdSchema = z.string().min(1).max(100);

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(""),
  basePrice: z.number().nonnegative().max(100000000),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  images: z.array(z.string().url().max(2000)).max(20).default([]),
  sku: z.string().min(1).max(100),
  initialStock: z.number().int().min(0).max(1000000).default(0),
  isPublished: z.boolean().default(false),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum([
    "LEVEL_1",
    "LEVEL_2",
    "LEVEL_3",
    "LEVEL_4",
    "LEVEL_5",
    "LEVEL_6",
    "GUEST",
  ]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

const UpdateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  basePrice: z.number().nonnegative().max(100000000).optional(),
  categoryId: z.string().uuid().optional(),
  images: z.array(z.string().url().max(2000)).max(20).optional(),
  isPublished: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum([
    "LEVEL_1",
    "LEVEL_2",
    "LEVEL_3",
    "LEVEL_4",
    "LEVEL_5",
    "LEVEL_6",
    "GUEST",
  ]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

const DeleteProductSchema = z.object({
  id: z.string().uuid(),
  permanent: z.boolean().default(false),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum([
    "LEVEL_1",
    "LEVEL_2",
    "LEVEL_3",
    "LEVEL_4",
    "LEVEL_5",
    "LEVEL_6",
    "GUEST",
  ]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type DeleteProductInput = z.infer<typeof DeleteProductSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// RBAC PERMISSION MATRIX
// ─────────────────────────────────────────────────────────────────────────────

const PRODUCT_PERMISSIONS = {
  VIEW_PRODUCTS: [
    "LEVEL_1",
    "LEVEL_2",
    "LEVEL_3",
    "LEVEL_4",
    "LEVEL_5",
    "LEVEL_6",
    "GUEST",
  ] as RBACLevel[],
  VIEW_ARCHIVED: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] as RBACLevel[],
} as const;

function hasPermission(
  level: RBACLevel,
  permission: keyof typeof PRODUCT_PERMISSIONS,
): boolean {
  return PRODUCT_PERMISSIONS[permission].includes(level);
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM ERROR HIERARCHY
// ─────────────────────────────────────────────────────────────────────────────

export class ProductError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly productId?: string,
    public readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM",
  ) {
    super(message);
    this.name = "ProductError";
    Object.setPrototypeOf(this, ProductError.prototype);
  }
}

export class ProductPermissionError extends ProductError {
  constructor(level: RBACLevel, action: string) {
    super(
      `RBAC violation: Level ${level} cannot perform '${action}'`,
      "RBAC_VIOLATION",
      undefined,
      "HIGH",
    );
    this.name = "ProductPermissionError";
  }
}

export class ProductValidationError extends ProductError {
  constructor(message: string, productId?: string) {
    super(message, "VALIDATION_ERROR", productId, "LOW");
    this.name = "ProductValidationError";
  }
}

/** Validation uniquement : les mutations doivent authentifier l'acteur côté serveur. */
function parseProductInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ProductValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
    );
  }
  return result.data;
}

export function parseCreateProductInput(input: unknown): CreateProductInput {
  return parseProductInput(CreateProductSchema, input);
}

export function parseUpdateProductInput(input: unknown): UpdateProductInput {
  const parsed = parseProductInput(UpdateProductSchema, input);
  const changes = [
    parsed.name, parsed.description, parsed.basePrice, parsed.categoryId,
    parsed.images, parsed.isPublished, parsed.isArchived,
  ];
  if (changes.every((value) => value === undefined)) {
    throw new ProductValidationError("At least one product field must be updated", parsed.id);
  }
  return parsed;
}

export function parseDeleteProductInput(input: unknown): DeleteProductInput {
  return parseProductInput(DeleteProductSchema, input);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPERS (JSON ↔ Domain ↔ DB)
// ─────────────────────────────────────────────────────────────────────────────

function mapJsonProduct(p: Record<string, unknown>): Product {
  const basePrice = Number(p.price || 0);
  const rawImage = String(p.image || "");

  let cleanPath = rawImage;
  if (
    cleanPath &&
    !cleanPath.startsWith("/media/") &&
    !cleanPath.startsWith("http")
  ) {
    cleanPath = `/media${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
  }

  return {
    id: String(p.id),
    name: String(p.name || "Produit sans nom"),
    description: String(p.description || "Aucune description disponible"),
    priceUSD: basePrice,
    priceCDF: Math.round(basePrice * EXCHANGE_RATE_CDF),
    stock: Number(p.stock ?? 10),
    image: cleanPath || "/media/placeholder.webp",
    mediaUrls: cleanPath ? [cleanPath] : [],
    category: String(p.category || "femme"),
  };
}

type DbProduct = Prisma.ProductGetPayload<{
  include: {
    category: { select: { slug: true } };
    variants: { select: { sku: true; stock: true } };
  };
}>;

function mapDbProduct(p: DbProduct): Product {
  const priceUSD = Math.round(Number(p.basePrice ?? 0)) / 100;
  const image = p.images[0] ?? "/media/placeholder.webp";

  return {
    id: p.variants[0]?.sku ?? p.id,
    name: p.name,
    description: p.description ?? "Aucune description disponible",
    priceUSD,
    priceCDF: Math.round(priceUSD * EXCHANGE_RATE_CDF),
    stock: p.variants[0]?.stock ?? 0,
    image,
    mediaUrls: p.images.length ? p.images : [image],
    category: p.category?.slug ?? "femme",
  };
}

function getProductsFromJson(): Product[] {
  try {
    const products = Object.values(productData.products).flat();
    return products.map((p) =>
      mapJsonProduct(p as unknown as Record<string, unknown>),
    );
  } catch (error) {
    console.error("[PRODUCTS] JSON fallback error:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ OPERATIONS (Cached & Optimized)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductListOptions {
  includeArchived?: boolean;
  categorySlug?: string;
  searchQuery?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
  offset?: number;
  actorLevel?: RBACLevel;
}

export interface ProductListResult {
  products: Product[];
  total: number;
  hasMore: boolean;
}

export const getAllProducts = cache(
  async (options: ProductListOptions = {}): Promise<ProductListResult> => {
    const {
      includeArchived = false,
      categorySlug,
      searchQuery,
      minPrice,
      maxPrice,
      limit = 100,
      offset = 0,
      actorLevel = "GUEST",
    } = options;

    if (!hasPermission(actorLevel, "VIEW_PRODUCTS")) {
      throw new ProductPermissionError(actorLevel, "viewProducts");
    }
    if (includeArchived && !hasPermission(actorLevel, "VIEW_ARCHIVED")) {
      throw new ProductPermissionError(actorLevel, "viewArchivedProducts");
    }

    try {
      const where: Prisma.ProductWhereInput = {};
      if (!includeArchived) where.isArchived = false;
      if (categorySlug) where.category = { slug: categorySlug };

      if (searchQuery) {
        where.OR = [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
        ];
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.basePrice = {
          ...(minPrice !== undefined ? { gte: minPrice * 100 } : {}),
          ...(maxPrice !== undefined ? { lte: maxPrice * 100 } : {}),
        };
      }

      const [dbProducts, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: { select: { slug: true } },
            variants: { select: { sku: true, stock: true }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
        }),
        prisma.product.count({ where }),
      ]);

      if (dbProducts.length > 0) {
        return {
          products: dbProducts.map(mapDbProduct),
          total,
          hasMore: offset + dbProducts.length < total,
        };
      }
    } catch (error) {
      console.warn("[PRODUCTS] Database fallback to JSON:", error);
    }

    const jsonProducts = getProductsFromJson();
    const filtered = jsonProducts.filter((p) => {
      if (categorySlug && p.category !== categorySlug) return false;
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (minPrice !== undefined && p.priceUSD < minPrice) return false;
      if (maxPrice !== undefined && p.priceUSD > maxPrice) return false;
      return true;
    });

    return {
      products: filtered.slice(offset, offset + limit),
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    };
  },
);

export async function getProductById(
  id: string,
  actorLevel: RBACLevel = "GUEST",
): Promise<Product | null> {
  if (!hasPermission(actorLevel, "VIEW_PRODUCTS")) {
    throw new ProductPermissionError(actorLevel, "viewProduct");
  }
  const validatedId = ProductIdSchema.safeParse(id);
  if (!validatedId.success) {
    throw new ProductValidationError(`Invalid product identifier: ${id}`, id);
  }

  try {
    const byVariant = await prisma.productVariant.findFirst({
      where: { OR: [{ sku: id }, { id }] },
      include: {
        product: {
          include: {
            category: { select: { slug: true } },
            variants: { select: { sku: true, stock: true }, take: 1 },
          },
        },
      },
    });

    if (byVariant?.product && !byVariant.product.isArchived) {
      return mapDbProduct(byVariant.product);
    }

    const byProduct = await prisma.product.findFirst({
      where: { OR: [{ id }, { slug: id }], isArchived: false },
      include: {
        category: { select: { slug: true } },
        variants: { select: { sku: true, stock: true }, take: 1 },
      },
    });

    if (byProduct) return mapDbProduct(byProduct);
  } catch (error) {
    console.warn("[PRODUCTS] Database fallback to JSON for ID:", id, error);
  }

  const jsonProduct = getProductsFromJson().find((p) => p.id === id);
  return jsonProduct ?? null;
}

export async function getProductsByIds(
  ids: string[],
  actorLevel: RBACLevel = "GUEST",
): Promise<Map<string, Product>> {
  if (!hasPermission(actorLevel, "VIEW_PRODUCTS")) {
    throw new ProductPermissionError(actorLevel, "viewProducts");
  }
  const validatedIds = z.array(ProductIdSchema).max(50).safeParse(ids);
  if (!validatedIds.success) {
    throw new ProductValidationError("Invalid product IDs array");
  }

  const productMap = new Map<string, Product>();

  try {
    const dbProducts = await prisma.product.findMany({
      where: {
        OR: [
          { id: { in: ids } },
          { slug: { in: ids } },
          { variants: { some: { sku: { in: ids } } } },
        ],
        isArchived: false,
      },
      include: {
        category: { select: { slug: true } },
        variants: { select: { sku: true, stock: true } },
      },
    });

    for (const product of dbProducts) {
      const mapped = mapDbProduct(product);
      productMap.set(product.id, mapped);
      if (product.variants[0]?.sku)
        productMap.set(product.variants[0].sku, mapped);
    }

    if (productMap.size > 0) return productMap;
  } catch (error) {
    console.warn("[PRODUCTS] Database fallback to JSON for batch:", error);
  }

  const jsonProducts = getProductsFromJson();
  const filtered = jsonProducts.filter((p) => ids.includes(p.id));

  for (const p of filtered) {
    productMap.set(p.id, p);
    if (p.mediaUrls?.[0]) productMap.set(p.mediaUrls[0], p);
  }

  return productMap;
}
