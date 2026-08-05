// app/api/product/[id]/preview/route.ts
// =============================================================================
// API — Aperçu d'un produit (DRAFT/PENDING/SCHEDULED) comme il apparaîtra en boutique
// =============================================================================
// GET /api/product/[id]/preview
// Retourne le produit mappé via mapCatalogProduct (CatalogProduct) pour l'aperçu
// admin, même si le produit n'est pas encore publié.
//
// RBAC :
//   - Non authentifié → 401
//   - Level 1-3 (SUPER_ADMIN/ADMIN/MANAGER) → accès à tous les produits
//   - Level 4+ (EDITOR/SUPERVISOR/USER) → accès uniquement à ses brouillons
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromProvider } from "@/lib/auth/session-provider";
import { mapCatalogProduct } from "@/lib/product-catalog/catalog-mappers";
import {
  normalizeProduct,
  type RawCatalogProduct,
} from "@/lib/product-catalog/catalog-types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/product/[id]/preview
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    // ── 1. Authentification ──
    const user = await getCurrentUserFromProvider();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    // ── 2. Charger le produit (y compris non publiés) ──
    const raw = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        productImages: {
          orderBy: { position: "asc" as const },
          select: { url: true, position: true },
        },
        availabilityProjection: {
          select: { isAvailable: true },
        },
      },
    });

    if (!raw) {
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 404 },
      );
    }

    // ── 3. RBAC : accès aux brouillons ──
    // Level 1-3 voit tout ; Level 4+ voit uniquement ses propres produits.
    if (user.level > 3) {
      const isOwner = raw.createdBy === user.id || raw.userId === user.id;
      if (!isOwner) {
        return NextResponse.json(
          { error: "Accès refusé à ce produit" },
          { status: 403 },
        );
      }
    }

    // ── 4. Normaliser (Decimal → number) puis mapper ──
    const normalized = normalizeProduct(raw);
    if (!normalized) {
      return NextResponse.json({ error: "Produit invalide" }, { status: 500 });
    }

    const mapped = mapCatalogProduct(
      normalized as unknown as RawCatalogProduct,
    );

    return NextResponse.json({
      success: true,
      product: mapped,
      status: raw.status,
    });
  } catch (error) {
    console.error("[PRODUCT_PREVIEW]", error);
return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
