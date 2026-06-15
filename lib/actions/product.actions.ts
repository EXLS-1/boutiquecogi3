// lib/actions/products.ts
// ============================================
// ACTIONS PRODUIT — Read + Bulk (Server Actions)
// ============================================

"use server";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getCurrentUserRole,
  hasPermission,
  requireAdminOrSuperAdmin,
  getNumericRestriction,
  isRestrictionEnabled,
  PERMISSIONS,
  RESTRICTIONS,
  ROLES,
  type Role,
} from "@/lib/auth/rbac";

// ═══════════════════════════════════════════
// TYPES & RESPONSE
// ═══════════════════════════════════════════

export type ActionResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export interface ProductSummary {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════
// CONFIG PRISMA (réutilisée partout)
// ═══════════════════════════════════════════

const productSelect = {
  id: true,
  name: true,
  description: true,
  basePrice: true,
  images: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { slug: true } },
  variants: { select: { sku: true }, take: 1 },
} as const;

function mapProduct(p: {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: { slug: string } | null;
  variants: { sku: string }[];
}): ProductSummary {
  return {
    id: p.variants[0]?.sku ?? p.id,
    name: p.name,
    description: p.description,
    price: Math.round(p.basePrice / 100),
    images: p.images,
    category: p.category?.slug ?? "femme",
    stock: 10,
    isFeatured: p.isFeatured,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ═══════════════════════════════════════════
// SECTION 1 : LECTURE (avec cache React)
// ═══════════════════════════════════════════

interface GetProductsParams {
  category?: string;
  limit?: number;
  featured?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "PUBLISHED" | "DRAFT" | "ARCHIVED";
}

export const getProducts = cache(
  async (
    params: GetProductsParams = {},
  ): Promise<
    ActionResponse<{
      products: ProductSummary[];
      total: number;
      page: number;
      pageSize: number;
    }>
  > => {
    try {
      const {
        category,
        limit = 20,
        featured,
        page = 1,
        pageSize = 20,
        search,
        status,
      } = params;

      const take = Math.min(Math.max(limit || pageSize, 1), 50);
      const skip = (Math.max(page, 1) - 1) * take;

      const where: Record<string, unknown> = { isArchived: false };

      if (category) where.category = { slug: category };
      if (featured !== undefined) where.isFeatured = featured;
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [total, products] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take,
          select: productSelect,
        }),
      ]);

      return {
        success: true,
        data: {
          products: products.map(mapProduct),
          total,
          page,
          pageSize: take,
        },
      };
    } catch (error) {
      console.error("[getProducts]", error);
      return {
        success: false,
        error: "Impossible de charger le catalogue.",
        code: "PRODUCT_FETCH_ERROR",
      };
    }
  },
);

export const getProductByIdAction = cache(
  async (id: string): Promise<ActionResponse<ProductSummary | null>> => {
    try {
      if (!id) return { success: false, error: "ID invalide" };

      const product = await prisma.product.findFirst({
        where: {
          OR: [{ id }, { slug: id }, { variants: { some: { sku: id } } }],
          isArchived: false,
        },
        select: productSelect,
      });

      return {
        success: true,
        data: product ? mapProduct(product) : null,
      };
    } catch (error) {
      console.error("[getProductByIdAction]", error);
      return {
        success: false,
        error: "Impossible de charger le produit",
        code: "PRODUCT_FETCH_ERROR",
      };
    }
  },
);

export const getFeaturedProducts = cache(
  async (limit = 8): Promise<ActionResponse<ProductSummary[]>> => {
    try {
      const products = await prisma.product.findMany({
        where: { isArchived: false, isFeatured: true },
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(limit, 1), 50),
        select: productSelect,
      });

      return { success: true, data: products.map(mapProduct) };
    } catch (error) {
      console.error("[getFeaturedProducts]", error);
      return {
        success: false,
        error: "Impossible de charger les produits en vedette",
        code: "FEATURED_FETCH_ERROR",
      };
    }
  },
);

// ═══════════════════════════════════════════
// SECTION 2 : BULK OPERATIONS (mutations)
// ═══════════════════════════════════════════

// ── Schemas Zod ──

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  softDelete: z.boolean().default(false),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  data: z.object({
    isActive: z.boolean().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    categoryId: z.string().uuid().optional(),
    price: z.number().positive().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

// ── Helpers privés ──

async function verifyBulkLimit(role: Role, count: number): Promise<void> {
  const maxBulk = await getNumericRestriction(
    role,
    RESTRICTIONS.MAX_PRODUCTS_PER_USER,
  );
  if (count > maxBulk && maxBulk > 0) {
    throw new Error(`Limite bulk dépassée: ${maxBulk} max, ${count} demandés`);
  }
}

function buildWhereFromFilters(
  filters?: Record<string, unknown>,
): Record<string, unknown> {
  if (!filters) return {};
  const where: Record<string, unknown> = {};

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search as string, mode: "insensitive" } },
      { sku: { contains: filters.search as string, mode: "insensitive" } },
    ];
  }
  if (filters.priceMin || filters.priceMax) {
    where.price = {};
    if (filters.priceMin)
      (where.price as Record<string, unknown>).gte = filters.priceMin;
    if (filters.priceMax)
      (where.price as Record<string, unknown>).lte = filters.priceMax;
  }

  return where;
}

// ── 1. BULK DELETE (Admin/SuperAdmin only) ──

export async function bulkDeleteProducts(
  input: unknown,
): Promise<ActionResponse<{ count: number; softDeleted: boolean }>> {
  try {
    const { userId, role } = await requireAdminOrSuperAdmin();

    const parsed = bulkDeleteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validation: ${parsed.error.message}`,
        code: "VALIDATION_ERROR",
      };
    }

    const { ids, softDelete } = parsed.data;

    if (!(await hasPermission(role, PERMISSIONS.PRODUCTS_DELETE))) {
      return {
        success: false,
        error: "Permission PRODUCTS_DELETE requise",
        code: "FORBIDDEN",
      };
    }

    await verifyBulkLimit(role, ids.length);

    // Vérification existence
    const existingCount = await prisma.product.count({
      where: { id: { in: ids } },
    });
    if (existingCount !== ids.length) {
      return {
        success: false,
        error: "Certains produits n'existent pas",
        code: "NOT_FOUND",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      if (softDelete) {
        const updated = await tx.product.updateMany({
          where: { id: { in: ids } },
          data: {
            deletedAt: new Date(),
            isActive: false,
            status: "ARCHIVED",
            updatedBy: userId,
          },
        });
        return { count: updated.count, softDeleted: true as const };
      }

      const deleted = await tx.product.deleteMany({
        where: { id: { in: ids } },
      });
      return { count: deleted.count, softDeleted: false as const };
    });

    revalidatePath("/products");
    revalidatePath("/admin/products");

    return { success: true, data: result };
  } catch (error) {
    console.error("[bulkDeleteProducts]", error);
    if (error instanceof Error && error.message.includes("Limite")) {
      return { success: false, error: error.message, code: "QUOTA_EXCEEDED" };
    }
    return {
      success: false,
      error: "Échec de la suppression",
      code: "BULK_DELETE_ERROR",
    };
  }
}

// ── 2. BULK UPDATE ──

export async function bulkUpdateProducts(
  input: unknown,
): Promise<ActionResponse<{ count: number }>> {
  try {
    const role = await getCurrentUserRole();

    if (!(await hasPermission(role, PERMISSIONS.PRODUCTS_UPDATE))) {
      return {
        success: false,
        error: "Permission PRODUCTS_UPDATE requise",
        code: "FORBIDDEN",
      };
    }

    const parsed = bulkUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validation: ${parsed.error.message}`,
        code: "VALIDATION_ERROR",
      };
    }

    const { ids, data } = parsed.data;
    await verifyBulkLimit(role, ids.length);

    const isRestricted = await isRestrictionEnabled(
      role,
      RESTRICTIONS.RESTRICTED_TO_OWN_DATA,
    );
    const whereClause = isRestricted
      ? {
          id: { in: ids },
          createdBy: (await auth.api.getSession({ headers: await headers() }))
            ?.user?.id,
        }
      : { id: { in: ids } };

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.updateMany({
        where: whereClause,
        data: { ...data, updatedAt: new Date() },
      });
      return { count: updated.count };
    });

    revalidatePath("/products");
    return { success: true, data: result };
  } catch (error) {
    console.error("[bulkUpdateProducts]", error);
    return {
      success: false,
      error: "Échec de la mise à jour",
      code: "BULK_UPDATE_ERROR",
    };
  }
}

// ── 3. BULK STATUS CHANGE ──

export async function bulkChangeStatus(
  ids: string[],
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED",
): Promise<ActionResponse<{ count: number; status: string }>> {
  try {
    const role = await getCurrentUserRole();

    const requiredPerm =
      status === "ARCHIVED"
        ? PERMISSIONS.PRODUCTS_BULK_EDIT
        : PERMISSIONS.PRODUCTS_UPDATE;
    if (!(await hasPermission(role, requiredPerm))) {
      return {
        success: false,
        error: `Permission ${requiredPerm} requise`,
        code: "FORBIDDEN",
      };
    }

    if (!ids.length || ids.length > 500) {
      return {
        success: false,
        error: "Sélection invalide (1-500)",
        code: "VALIDATION_ERROR",
      };
    }

    await verifyBulkLimit(role, ids.length);

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status, isActive: status === "PUBLISHED", updatedAt: new Date() },
    });

    revalidatePath("/products");
    return { success: true, data: { count: result.count, status } };
  } catch (error) {
    console.error("[bulkChangeStatus]", error);
    return {
      success: false,
      error: "Échec du changement de statut",
      code: "BULK_STATUS_ERROR",
    };
  }
}

// ── 4. BULK DELETE CROSS-PAGES (selectAllMode) ──

export async function bulkDeleteAllPages(
  filters: Record<string, unknown> | undefined,
  softDelete: boolean,
): Promise<ActionResponse<{ count: number; softDeleted: boolean }>> {
  try {
    const { userId, role } = await requireAdminOrSuperAdmin();

    if (!(await hasPermission(role, PERMISSIONS.PRODUCTS_DELETE))) {
      return { success: false, error: "Permission requise", code: "FORBIDDEN" };
    }

    const where = buildWhereFromFilters(filters);
    const allProducts = await prisma.product.findMany({
      where: { ...where, isArchived: false },
      select: { id: true },
    });

    const ids = allProducts.map((p) => p.id);
    if (ids.length === 0) {
      return {
        success: false,
        error: "Aucun produit ne correspond aux critères",
        code: "NO_MATCH",
      };
    }

    await verifyBulkLimit(role, ids.length);

    const result = await prisma.$transaction(async (tx) => {
      if (softDelete) {
        const updated = await tx.product.updateMany({
          where: { id: { in: ids } },
          data: {
            deletedAt: new Date(),
            isActive: false,
            status: "ARCHIVED",
            updatedBy: userId,
          },
        });
        return { count: updated.count, softDeleted: true as const };
      }
      const deleted = await tx.product.deleteMany({
        where: { id: { in: ids } },
      });
      return { count: deleted.count, softDeleted: false as const };
    });

    revalidatePath("/products");
    revalidatePath("/admin/products");

    return { success: true, data: result };
  } catch (error) {
    console.error("[bulkDeleteAllPages]", error);
    return {
      success: false,
      error: "Échec de la suppression globale",
      code: "BULK_DELETE_ALL_ERROR",
    };
  }
}
