// app/api/health/route.ts
// Ce fichier gère la route GET /api/health pour vérifier la santé de l'application.
// Il teste la connexion à la base de données et retourne des statistiques de base.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() {
  try {
    // Test de connexion à la base de données
    await prisma.$connect();

    // Récupérer quelques statistiques
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const orderCount = await prisma.order.count();

    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      stats: {
        products: productCount,
        users: userCount,
        orders: orderCount,
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
