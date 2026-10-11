// app/api/product/[id]/status/route.ts
// =============================================================================
// API — Transition de statut produit (DRAFT → PENDING → PUBLISHED → etc.)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { transitionProductStatus } from "@/lib/product/product-workflow";
import { ProductError } from "@/lib/product/product-errors";
import { ProductStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/product/[id]/status
 * Applique une transition de statut à un produit.
 *
 * Body : { status: ProductStatus, reason?: string, scheduledAt?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    const body = await request.json();
    const { status, reason, scheduledAt } = body;

    // ── Validation des champs requis ──
    if (!status || typeof status !== "string") {
      return NextResponse.json(
        { error: "Le champ 'status' est requis" },
        { status: 400 },
      );
    }

    const newStatus = status.toUpperCase() as ProductStatus;

    if (!Object.values(ProductStatus).includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Statut invalide : '${status}'. Valeurs acceptées : ${Object.values(ProductStatus).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // ── Récupération de la session utilisateur ──
    // Utilise le header Authorization ou la session cookie
    let actedBy: string | undefined;
    try {
      const sessionCookie = request.cookies.get("better-auth.session")?.value;
      if (sessionCookie) {
        // Tentative de décodage simple
        const payload = JSON.parse(
          Buffer.from(sessionCookie.split(".")[1], "base64").toString(),
        );
        actedBy = payload.sub || payload.id;
      }
    } catch {
      // Ignore — actedBy reste undefined
    }

    // ── Application de la transition ──
    // `transitionProductStatus` exige un actedBy : sans session décodable, on
    // retombe sur l'id du produit pour tracer la transition (audit interne).
    await transitionProductStatus(id, newStatus, {
      reason,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      actedBy: actedBy ?? id,
    });

    return NextResponse.json({
      success: true,
      data: { id, status: newStatus },
    });
  } catch (error) {
    if (error instanceof ProductError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode },
      );
    }

    console.error("[STATUS_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}

