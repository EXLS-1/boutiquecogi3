// app/api/exchange-rate/route.ts
// =============================================================================
// Route API publique pour récupérer le taux de change USD/CDF.
// Optimisée pour des performances maximales (< 50ms) via lecture cache exclusive.
// Sécurisée par RBAC : GUEST (L0) peut lire, ADMIN+ peut forcer refresh.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getFastUSDToCDFRate,
  forceRefreshExchangeRate,
} from "@/lib/exchange-rate/exchange-rate-service";
import { ExchangeRateApiResponse } from "@/lib/currency/exchange-rate-types";

// ─── RBAC & Authentification ──────────────────────────────────────────────────

/** Niveaux de privilège (1=SUPER-ADMIN ... 6=USER, 7=GUEST) */
type PrivilegeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AuthContext {
  readonly isAuthenticated: boolean;
  readonly privilegeLevel: PrivilegeLevel;
  readonly userId?: string;
}

/**
 * Extrait le contexte d'authentification depuis la requête.
 * En l'absence de session, retourne GUEST (L7).
 */
async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return { isAuthenticated: false, privilegeLevel: 7 };
    }

    const privilegeLevel = (session.user.level as number | undefined) ?? 7;

    return {
      isAuthenticated: true,
      privilegeLevel: privilegeLevel as PrivilegeLevel,
      userId: session.user.id,
    };
  } catch {
    return { isAuthenticated: false, privilegeLevel: 7 };
  }
}

/**
 * Vérifie si le niveau de privilège satisfait le minimum requis.
 */
function hasPrivilege(
  ctx: AuthContext,
  requiredLevel: PrivilegeLevel,
): boolean {
  // GUEST (7) peut accéder aux ressources publiques
  // Les utilisateurs connectés (1-6) ont toujours accès aux ressources publiques
  if (requiredLevel === 7) return true;
  if (!ctx.isAuthenticated) return false;
  return ctx.privilegeLevel <= requiredLevel;
}

// ─── Helpers de réponse ─────────────────────────────────────────────────────

function successResponse(
  data: Omit<ExchangeRateApiResponse, "success" | "error">,
): NextResponse {
  return NextResponse.json(
    { success: true, ...data } satisfies ExchangeRateApiResponse,
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    } satisfies ExchangeRateApiResponse,
    { status },
  );
}

// ─── Schémas de validation ────────────────────────────────────────────────────

const refreshQuerySchema = z.object({
  refresh: z.enum(["true", "1"]).optional(),
});

// ─── Route Handlers ───────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/exchange-rate
 * Récupère le taux de change actuel (lecture cache, < 50ms).
 * Accessible à tous (GUEST inclus).
 * Paramètre query `refresh=true` réservé aux ADMIN+ (L1-L2).
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    const auth = await getAuthContext(request);
    const { searchParams } = new URL(request.url);
    const query = refreshQuerySchema.safeParse({
      refresh: searchParams.get("refresh") ?? undefined,
    });

    const wantsRefresh = query.success && !!query.data.refresh;

    // ── Vérification RBAC pour le refresh forcé ──────────────────────────────
    if (wantsRefresh) {
      if (!hasPrivilege(auth, 2)) {
        // ADMIN = L2 minimum
        return errorResponse(
          "FORBIDDEN",
          "Privilège insuffisant pour forcer le rafraîchissement. Niveau requis : ADMIN (L2).",
          403,
        );
      }

      const rate = await forceRefreshExchangeRate();
      if (!rate) {
        return errorResponse(
          "REFRESH_FAILED",
          "Impossible de rafraîchir le taux depuis la BCC. Le cache existant est conservé.",
          503,
        );
      }

      const duration = Math.round(performance.now() - startTime);
      return successResponse({
        rate: rate.toString(),
        currency: "CDF",
        base: "USD",
        timestamp: new Date().toISOString(),
      });
    }

    // ── Lecture rapide (cache uniquement) ────────────────────────────────────
    const rate = await getFastUSDToCDFRate();
    const duration = Math.round(performance.now() - startTime);

    console.log(`[API_EXCHANGE_RATE] GET répondu en ${duration}ms`);

    return successResponse({
      rate: rate.toString(),
      currency: "CDF",
      base: "USD",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API_EXCHANGE_RATE_GET_ERROR]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Erreur interne lors de la récupération du taux de change.",
      500,
    );
  }
}

/**
 * OPTIONS /api/exchange-rate
 * Répond aux requêtes preflight CORS.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
