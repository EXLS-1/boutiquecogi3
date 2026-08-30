// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ProductService } from "@/lib/products/productService";
import { z } from "zod";

/**
 * Schéma de validation de la route API.
 * Le slug est généré côté serveur (resolveUniqueSlug) — il peut être fourni
 * mais n'est pas requis. Le catalogId est optionnel car le service ne
 * l'utilise pas directement. Tous les critères (category, couleur, taille,
 * description…) restent facultatifs pour autoriser les produits minimalistes.
 */
const createProductSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  catalogId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
  variants: z.array(z.object({
    sku: z.string().optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().default({}),
    priceOffset: z.number().optional(),
    initialStock: z.number().int().min(0).optional().default(0),
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

    // 1. Validation stricte par Zod (critères dynamiques minimaux → matrice complète)
    const baseData = createProductSchema.parse(body);

    // 2. Transformation vers le DTO consommé par ProductService.createDynamicProduct
    //    - images { url, altText, isPrimary }[]  →  string[] (URL simple, Prisma attend String[])
    //    - priceAdjustment                       →  priceOffset   (aligné sur le schema service)
    const servicePayload = {
      name: baseData.name,
      ...(baseData.slug ? { slug: baseData.slug } : {}),
      ...(baseData.description ? { description: baseData.description } : {}),
      ...(baseData.categoryId ? { categoryId: baseData.categoryId } : {}),
      ...(baseData.basePrice !== undefined ? { basePrice: baseData.basePrice } : {}),
      attributes: baseData.attributes ?? {},
      images: baseData.images?.map((img) => img.url) ?? [],
      variants: (baseData.variants ?? []).map((v) => ({
        ...(v.sku ? { sku: v.sku } : {}),
        attributes: v.attributes ?? {},
        ...(v.priceOffset !== undefined ? { priceOffset: v.priceOffset } : {}),
        ...(v.initialStock !== undefined ? { initialStock: v.initialStock } : { initialStock: 0 }),
      })),
    };

    // 3. Exécution atomique (transaction Serializable + validation runtime)
    const result = await ProductService.createProduct(servicePayload, session.user.id);

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