// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductService } from "@/lib/products/productService";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  categoryId: z.string().uuid(),
  catalogId: z.string().uuid(),
  metadata: z.record(z.unknown()).optional(),
  attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
  variants: z.array(z.object({
    attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
    priceAdjustment: z.number().optional(),
    initialStock: z.number().int().min(0),
    images: z.array(z.string().url()).optional(),
    isDefault: z.boolean().optional(),
  })).optional(),
  images: z.array(z.object({
    url: z.string().url(),
    altText: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier permission admin (RBAC Level 4+)
    // if (session.user.roleLevel < 4) return ...

    const body = await req.json();
    
    // Validation de base (la validation dynamique se fait dans le service)
    const baseData = createProductSchema.parse(body);

    const result = await ProductService.createProduct(baseData, session.user.id);

    return NextResponse.json({
      success: true,
      data: {
        productId: result.productId,
        variantCount: result.variantCount,
        totalStock: result.totalStock,
      },
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Validation failed",
        details: error.errors,
      }, { status: 400 });
    }
    
    console.error("[POST /api/admin/products]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error",
    }, { status: 500 });
  }
}

// app/api/admin/stock/movements/route.ts
const stockMovementSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().refine(n => n !== 0, { message: "Quantity cannot be zero" }),
  reason: z.enum(["PURCHASE", "SALE", "RETURN", "ADJUSTMENT", "CANCELLED", "INITIAL"]),
  referenceId: z.string().uuid().optional(),
  referenceType: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = stockMovementSchema.parse(body);

    let result;
    if (data.quantity > 0) {
      result = await ProductService.addStock(data, session.user.id);
    } else {
      result = await ProductService.removeStock(data, session.user.id);
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("[POST /api/admin/stock/movements]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal error" }, { status: 500 });
  }
}