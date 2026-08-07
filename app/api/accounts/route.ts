// app/api/accounts/route.ts
// API route publique pour lister tous les comptes d'authentification
// ============================================

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = accounts.map((acc) => ({
      id: acc.id,
      userId: acc.userId,
      type: acc.type,
      provider: acc.providerId,
      providerAccountId: acc.accountId,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
      expiresAt: acc.expiresAt,
      refreshTokenExpiresAt: acc.refreshTokenExpiresAt,
      scope: acc.scope,
      user: acc.user
        ? {
            id: acc.user.id,
            name: acc.user.name,
            email: acc.user.email,
            image: acc.user.image,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des comptes:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

