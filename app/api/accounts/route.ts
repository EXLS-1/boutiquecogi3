// app/api/accounts/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveAuthContext } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac-shared";

// Schéma de validation strict pour la pagination et les filtres de recherche
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Authentification obligatoire via BetterAuth / server.ts
    const authContext = await resolveAuthContext();
    if (!authContext || !authContext.isAuthenticated) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // 2. Contrôle d'accès strict par rôle et permissions
    // L'accès à la liste des comptes requiert les permissions de lecture utilisateur
    const hasReadPermission =
      authContext.permissions.has(PERMISSIONS["users:read"]) ||
      authContext.permissions.has(PERMISSIONS["users:view:any"]);

    if (!hasReadPermission) {
      return NextResponse.json(
        { error: "Accès refusé : privilèges insuffisants" },
        { status: 403 }
      );
    }

    // 3. Validation et parsing sécurisé des paramètres de requête (Pagination & Recherche)
    const url = new URL(request.url);
    const rawParams = {
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    };

    const parsedQuery = querySchema.safeParse(rawParams);
    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Paramètres de requête invalides",
          details: parsedQuery.error.format(),
        },
        { status: 400 }
      );
    }

    const { page, limit, search } = parsedQuery.data;
    const skip = (page - 1) * limit;

    // Construction de la clause WHERE Prisma sécurisée
    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // 4. Exécution optimisée en parallèle (comptage total + récupération paginée)
    const [totalItems, accounts] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          level: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    // 5. Réponse structurée avec métadonnées de pagination complètes
    return NextResponse.json(
      {
        data: accounts,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // 6. Masquage strict des erreurs internes (évite la fuite de stack traces ou de détails Prisma)
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[API_ACCOUNTS_ERROR]", {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
