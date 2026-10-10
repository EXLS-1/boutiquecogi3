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
import { serializeDecimal } from "@/lib/product-catalog/catalog-types";
import { z } from "zod";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const previewIdSchema = z.string().min(1).max(128);

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

    const { id: rawId } = await params;
    const parsedId = previewIdSchema.safeParse(rawId?.trim());
    if (!parsedId.success) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    const id = parsedId.data;

    // ── 2. Charger le produit (y compris non publiés) ──
    const raw = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        productImages: {
          orderBy: { position: "asc" },
          select: { url: true, position: true },
        },
        availabilityProjection: {
          select: { isAvailable: true },
        },
        productPrice: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { amount: true },
        },
      },
    });

    if (!raw || raw.isdeleted) {
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 404 },
      );
    }

    // ── 3. RBAC : accès aux brouillons ──
    // Level 1-3 voit tout ; Level 4+ voit uniquement ses propres produits.
    // createdBy/editorId sont nullables : on exige un owner défini avant comparaison.
    if (user.level > 3) {
      const ownerId = raw.createdBy ?? raw.userId ?? null;
      const isOwner = ownerId !== null && ownerId === user.id;
      if (!isOwner) {
        return NextResponse.json(
          { error: "Accès refusé à ce produit" },
          { status: 403 },
        );
      }
    }

    // ── 4. Normaliser (Decimal → number) puis mapper ──
    // normalizeProduct(s) attend productPrice[] ; ici on sérialise le montant
    // resté en centimes (Int) vers des unités pour mapCatalogProduct.
    const amountCents = raw.productPrice[0]?.amount ?? 0;
    const mapped = mapCatalogProduct({
      id: raw.id,
      name: raw.name,
      basePrice: serializeDecimal(amountCents) / 100,
      category: raw.category,
      productImages: raw.productImages,
      availabilityProjection: raw.availabilityProjection,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    } as unknown as Parameters<typeof mapCatalogProduct>[0]);

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
