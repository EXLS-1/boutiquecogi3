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
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ProductStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CRON_SECRET = process.env.CRON_SECRET;
const MAX_BATCH = 50;

function isAuthorized(authHeader: string | null): boolean {
  // Fail-closed : sans secret configuré, le cron reste désactivé.
  if (!CRON_SECRET || CRON_SECRET.length < 16) return false;
  if (!authHeader?.startsWith("Bearer ")) return false;
  const provided = authHeader.slice(7).trim();
  if (!provided) return false;
  const expected = Buffer.from(CRON_SECRET, "utf8");
  const actual = Buffer.from(provided, "utf8");
  // Comparaison constant-time pour éviter les timing attacks.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * GET /api/cron/publish-scheduled
 */
export async function GET(request: NextRequest) {
  // ── 1. Vérification du token CRON (Bearer uniquement, constant-time) ──
  // Le token en query (?token=) est volontairement refusé : il fuit dans
  // les logs/proxys. Seul `Authorization: Bearer <CRON_SECRET>` est accepté.
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      { error: "Non autorisé" },
      { status: 401 },
    );
  }

  try {
    console.log("[CRON_PUBLISH] Début de la publication des produits programmés...");

    const startTime = Date.now();
    const now = new Date();

    // Publication due uniquement (SCHEDULED + scheduledAt passé + non supprimé).
    const due = await prisma.product.findMany({
      where: {
        status: ProductStatus.SCHEDULED,
        isdeleted: false,
        isArchived: false,
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: MAX_BATCH,
      select: { id: true, status: true },
    });

    let published = 0;
    for (const item of due) {
      const updated = await prisma.product.updateMany({
        where: { id: item.id, status: ProductStatus.SCHEDULED },
        data: {
          status: ProductStatus.PUBLISHED,
          isActive: true,
          isArchived: false,
          publishedAt: now,
          scheduledAt: null,
        },
      });
      if (updated.count > 0) {
        published += 1;
        await prisma.productStatusHistory.create({
          data: {
            productId: item.id,
            oldStatus: ProductStatus.SCHEDULED,
            newStatus: ProductStatus.PUBLISHED,
            reason: "Publication programmée (cron)",
          },
        });
      }
    }

    const remaining = await prisma.product.count({
      where: {
        status: ProductStatus.SCHEDULED,
        isdeleted: false,
        isArchived: false,
        scheduledAt: { lte: new Date() },
      },
    });
    const duration = Date.now() - startTime;

    console.log(
      `[CRON_PUBLISH] Terminé en ${duration}ms — Publiés: ${published}, Restants: ${remaining}`,
    );

    return NextResponse.json({
      success: true,
      published,
      remaining,
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

