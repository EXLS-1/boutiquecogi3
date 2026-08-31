// app/api/products/bulk/route.ts
// ============================================
// Server Route — Exécution des actions groupées
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentUserRole,
  hasPermission,
  getNumericRestriction,
  PERMISSIONS,
  RESTRICTIONS,
} from "@/lib/auth/rbac";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const VALID_BULK_ACTIONS = [
  "delete",
  "activate",
  "deactivate",
  "archive",
  "change-category",
  "export",
] as const;

type BulkAction = (typeof VALID_BULK_ACTIONS)[number];

export async function POST(request: NextRequest) {
  try {
    const role = await getCurrentUserRole();

    // ── Auth & parse ──
    const body = await request.json();
    const { action, ids, categoryId } = body;

    if (!VALID_BULK_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 });
    }

    // ── Permission check par action ──
    const permissionMap: Record<
      BulkAction,
      typeof PERMISSIONS[keyof typeof PERMISSIONS]
    > = {
      delete: PERMISSIONS["products:delete"],
      activate: PERMISSIONS["products:update"],
      deactivate: PERMISSIONS["products:update"],
      archive: PERMISSIONS["products:bulk-edit"],
      "change-category": PERMISSIONS["products:update"],
      export: PERMISSIONS["products:export"],
    };

    const actionKey = action as BulkAction;

    if (!(await hasPermission(role, permissionMap[actionKey]))) {
      return NextResponse.json(
        { error: "Forbidden", code: "INSUFFICIENT_PERMISSIONS" },
        { status: 403 },
      );
    }

    // ── Restrictions check (quota) ──
    const maxBulk = await getNumericRestriction(
      role,
      RESTRICTIONS.MAX_PRODUCTS_PER_USER,
    );

    if (ids.length > maxBulk && maxBulk > 0) {
      return NextResponse.json(
        {
          error: "Bulk limit exceeded",
          limit: maxBulk,
          requested: ids.length,
        },
        { status: 429 },
      );
    }

    // ── Exécution ──
    let result;

    switch (action) {
      case "delete":
        result = await prisma.product.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      case "activate":
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true },
        });
        break;

      case "deactivate":
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { isActive: false },
        });
        break;

      case "archive":
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { status: "ARCHIVED" },
        });
        break;

      case "change-category": {
        if (!categoryId) {
          return NextResponse.json(
            { error: "categoryId required" },
            { status: 400 },
          );
        }

        // Validation d'existence (anti-clé étrangère orpheline)
        const categoryExists = await prisma.category.findUnique({
          where: { id: categoryId },
          select: { id: true },
        });
        if (!categoryExists) {
          return NextResponse.json(
            { error: "Category not found", categoryId },
            { status: 400 },
          );
        }

        result = await prisma.$transaction(async (tx) => {
          const updated = await tx.product.updateMany({
            where: { id: { in: ids } },
            data: { categoryId },
          });

          // Sync de la table de jointure : la catégorie devient principale et unique
          await tx.categoryProduct.deleteMany({
            where: { productId: { in: ids }, categoryId: { not: categoryId } },
          });
          const products = await tx.product.findMany({
            where: { id: { in: ids } },
            select: { id: true },
          });
          const withCategory = products.filter(
            (p) => ids.includes(p.id),
          );
          if (withCategory.length > 0) {
            await tx.categoryProduct.createMany({
              data: withCategory.map((p) => ({
                productId: p.id,
                categoryId,
                displayOrder: 0,
              })),
              skipDuplicates: true,
            });
          }

          return updated;
        });
        break;
      }

      case "export":
        const products = await prisma.product.findMany({
          where: { id: { in: ids } },
        });
        return NextResponse.json({ exported: products.length, products });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    // ── Revalidation ──
    revalidatePath("/products");
    revalidatePath("/admin/products");

    return NextResponse.json({
      success: true,
      action,
      affected: result?.count ?? 0,
    });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
