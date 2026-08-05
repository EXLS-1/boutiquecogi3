// app/api/cron/publish-scheduled/route.ts
// =============================================================================
// CRON — Publication automatique des produits SCHEDULED
//
// Exécuté par cron-job.org / Vercel Cron pour publier automatiquement
// les produits dont le scheduledAt est dépassé.
//
// Protection : CRON_SECRET (Bearer token) + IP whitelist cron-job.org
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { publishScheduledProducts } from "@/lib/products/product-workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/publish-scheduled
 */
export async function GET(request: NextRequest) {
  // ── 1. Vérification du token CRON ──
  const authHeader = request.headers.get("authorization");
  const urlToken = new URL(request.url).searchParams.get("token");

  const isValid =
    (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === CRON_SECRET) ||
    (urlToken && urlToken === CRON_SECRET);

  if (!isValid) {
    return NextResponse.json(
      { error: "Non autorisé" },
      { status: 401 },
    );
  }

  try {
    console.log("[CRON_PUBLISH] Début de la publication des produits programmés...");

    const startTime = Date.now();
    const result = await publishScheduledProducts(50);
    const duration = Date.now() - startTime;

    console.log(
      `[CRON_PUBLISH] Terminé en ${duration}ms — Publiés: ${result.published}, Restants: ${result.remaining}`,
    );

    return NextResponse.json({
      success: true,
      published: result.published,
      remaining: result.remaining,
      duration,
    });
  } catch (error) {
    console.error("[CRON_PUBLISH_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de la publication" },
      { status: 500 },
    );
  }
}

