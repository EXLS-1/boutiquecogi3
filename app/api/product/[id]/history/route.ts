// app/api/product/[id]/history/route.ts
// =============================================================================
// API — Historique des changements de statut d'un produit
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    const history = await prisma.productStatusHistory.findMany({
      where: { productId: id },
      orderBy: { changedAt: "desc" },
      include: {
        changedBy: {
          select: { name: true, email: true },
        },
      },
      take: 50,
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("[HISTORY_GET]", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 },
    );
  }
}
