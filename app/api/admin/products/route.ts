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
  metadata: z.record(z.string(), z.unknown()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  variants: z.array(z.object({
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier permission admin (RBAC Level 4+)
    // if (session.user.roleLevel < 4) return ...

    const body = await req.json();
    
    // Validation de base (la validation dynamique se fait dans le service)
    const baseData = createProductSchema.parse(body);

    const result = await ProductService.createProduct(
      { ...baseData, variants: baseData.variants ?? [] },
      session.user.id
    );

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
        details: error.issues,
      }, { status: 400 });
    }
    
    console.error("[POST /api/admin/products]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error",
    }, { status: 500 });
  }
}