// /app/api/products/bulk/route.ts
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
    const permissionMap: Record<string, string> = {
      delete: PERMISSIONS.PRODUCTS_DELETE,
      activate: PERMISSIONS.PRODUCTS_UPDATE,
      deactivate: PERMISSIONS.PRODUCTS_UPDATE,
      archive: PERMISSIONS.PRODUCTS_BULK_EDIT,
      "change-category": PERMISSIONS.PRODUCTS_UPDATE,
      export: PERMISSIONS.PRODUCTS_EXPORT,
    };

    if (!(await hasPermission(role, permissionMap[action]))) {
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

      case "change-category":
        if (!categoryId) {
          return NextResponse.json(
            { error: "categoryId required" },
            { status: 400 },
          );
        }
        result = await prisma.product.updateMany({
          where: { id: { in: ids } },
          data: { categoryId },
        });
        break;

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
