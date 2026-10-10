// app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProductService } from "@/lib/product/product-service";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
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
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    const sessionUserId = session?.user?.id;
    if (!sessionUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC : création produit réservée au staff (level <= 4 : SUPER_ADMIN → EDITOR)
    const staff = await prisma.user.findUnique({
      where: { id: sessionUserId },
      include: { roleAssignment: { include: { roleConfig: true } } },
    });
    if (!staff?.roleAssignment || staff.roleAssignment.roleConfig.level > 4) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = rateLimit(`admin-products:${sessionUserId}:${ip}`, 30, 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body: unknown = await req.json();

    // 1. Validation stricte par Zod (critères dynamiques minimaux → matrice complète)
    const baseData = createProductSchema.parse(body);

    // 2. Transformation vers le DTO consommé par ProductService.create
    //    - images { url, altText, isPrimary }[]  →  string[] (URL simple, Prisma attend String[])
    //    - priceOffset conservé tel quel (centimes), priceAdjustment n'existe pas côté service
    const servicePayload = {
      name: baseData.name,
      ...(baseData.slug ? { slug: baseData.slug } : {}),
      ...(baseData.description ? { description: baseData.description } : {}),
      ...(baseData.categoryId ? { categoryId: baseData.categoryId } : {}),
      ...(baseData.categoryId ? { categoryIds: [baseData.categoryId] } : {}),
      // Service attend des centimes (Int) ; l'API reçoit des unités.
      basePrice: Math.round(baseData.basePrice * 100),
      ...(baseData.compareAtPrice !== undefined
        ? { compareAtPrice: Math.round(baseData.compareAtPrice * 100) }
        : {}),
      attributes: baseData.attributes ?? {},
      images: baseData.images?.map((img) => img.url) ?? [],
      variants: (baseData.variants ?? []).map((v) => ({
        ...(v.sku ? { sku: v.sku } : {}),
        attributes: v.attributes ?? {},
        ...(v.priceOffset !== undefined ? { priceOffset: v.priceOffset } : {}),
        initialStock: v.initialStock ?? 0,
      })),
    };

    // 3. Exécution atomique (transaction Serializable + validation runtime)
    const result = await ProductService.create(servicePayload, sessionUserId);

    return NextResponse.json({
      success: true,
      data: {
        productId: result.productId,
        slug: result.slug,
        variantCount: servicePayload.variants.length,
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
