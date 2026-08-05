// app/api/product/drafts/route.ts
// =============================================================================
// API — Liste des brouillons & produits en attente de validation
// =============================================================================
// GET /api/product/drafts
// Retourne les produits en DRAFT, PENDING, SCHEDULED (+ PUBLISHED/ARCHIVED si
// demandé via ?status=) avec pagination et filtrage RBAC.
//
// RBAC :
//   - Non authentifié → 401
//   - Level 1-3 (SUPER_ADMIN/ADMIN/MANAGER) → voit tous les produits
//   - Level 4+ (EDITOR/SUPERVISOR/USER) → voit uniquement ses propres produits
//
// Query params :
//   ?status=DRAFT|PENDING|SCHEDULED|PUBLISHED|ARCHIVED (optionnel)
//   ?page=1 (défaut 1)
//   ?limit=20 (défaut 20, max 100)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromProvider } from "@/lib/auth/session-provider";
import type { Prisma } from "@prisma/client";
import { ProductStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Statuts considérés comme "brouillons" par défaut
const DEFAULT_STATUSES = [
  ProductStatus.DRAFT,
  ProductStatus.PENDING,
  ProductStatus.SCHEDULED,
];

const VALID_STATUSES = Object.values(ProductStatus);

/**
 * GET /api/product/drafts
 */
export async function GET(request: NextRequest) {
  try {
    // ── 1. Authentification ──
    const user = await getCurrentUserFromProvider();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // ── 2. Parse query params ──
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status")?.toUpperCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const skip = (page - 1) * limit;

    // Validation statut
    let statuses: ProductStatus[] = DEFAULT_STATUSES;
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as ProductStatus)) {
        return NextResponse.json(
          {
            error: `Statut invalide : '${statusParam}'. Valeurs acceptées : ${VALID_STATUSES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      statuses = [statusParam as ProductStatus];
    }

    // ── 3. Filtre RBAC ──
    // Level 1-3 voit tout ; Level 4+ voit uniquement ses propres produits.
    const where: Prisma.ProductWhereInput = {
      status: { in: statuses },
      isdeleted: false,
    };
    if (user.level > 3) {
      where.OR = [{ createdBy: user.id }, { userId: user.id }];
    }

    // ── 4. Requête paginée ──
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          status: true,
          basePrice: true,
          stock: { select: { quantity: true } },
          productImages: {
            orderBy: { position: "asc" as const },
            take: 1,
            select: { url: true, alt: true },
          },
          category: { select: { name: true, slug: true } },
          scheduledAt: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { variants: true } },
          statusHistory: {
            orderBy: { changedAt: "desc" as const },
            take: 5,
            select: {
              oldStatus: true,
              newStatus: true,
              reason: true,
              changedAt: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // ── 5. Sérialisation finale ──
    const serialized = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      basePrice: Number(p.basePrice),
      stock: p.stock?.quantity ?? 0,
      images: p.productImages,
      category: p.category,
      scheduledAt: p.scheduledAt?.toISOString() ?? null,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt?.toISOString() ?? null,
      updatedAt: p.updatedAt?.toISOString() ?? null,
      variantCount: p._count.variants,
      recentHistory: p.statusHistory.map((h) => ({
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        changedAt: h.changedAt?.toISOString() ?? null,
      })),
    }));

    return NextResponse.json({
      success: true,
      products: serialized,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[DRAFTS_LIST]", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
}
}
