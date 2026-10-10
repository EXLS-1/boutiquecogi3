// app/api/admin/stock/movements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { adjustVariantStock } from "@/lib/product-inventory/inventory.service";
import type { InventoryReason } from "@/lib/product-inventory/inventory.types";
import { z } from "zod";

const stockMovementSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().refine((n) => n !== 0, { message: "Quantity cannot be zero" }),
  reason: z.enum(["INITIAL", "RESTOCK", "PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "CANCELLED", "SHRINKAGE", "RESERVATION", "RELEASE"]),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const REASON_MAP: Record<string, InventoryReason> = {
  INITIAL: "INITIAL",
  RESTOCK: "RESTOCK",
  PURCHASE: "RESTOCK",
  SALE: "SALE",
  RETURN: "RETURN",
  ADJUSTMENT: "ADJUSTMENT",
  CANCELLED: "ADJUSTMENT",
  SHRINKAGE: "SHRINKAGE",
  RESERVATION: "RESERVATION",
  RELEASE: "RELEASE",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC : mouvements de stock réservés au staff (level <= 3)
    const staff = await prisma.user.findUnique({
      where: { id: sessionUserId },
      include: { roleAssignment: { include: { roleConfig: true } } },
    });
    if (!staff?.roleAssignment || staff.roleAssignment.roleConfig.level > 3) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = rateLimit(`stock-movements:${sessionUserId}:${ip}`, 60, 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body: unknown = await req.json();
    const data = stockMovementSchema.parse(body);

    // L'inventaire exige un delta signé : quantity > 0 = entrée, < 0 = sortie.
    const result = await adjustVariantStock({
      variantId: data.variantId,
      delta: data.quantity,
      reason: REASON_MAP[data.reason] ?? "ADJUSTMENT",
      referenceId: data.referenceId ?? null,
      notes: data.notes ?? data.referenceType ?? null,
      userId: sessionUserId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[POST /api/admin/stock/movements]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
