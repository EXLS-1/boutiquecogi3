// app/api/auth/get-session/route.tsx
// ============================================
// ROUTE API — RÉCUPÉRATION SESSION + CONTEXTE RBAC
// ============================================
// Endpoint GET exposant la session Better-Auth enrichie du contexte
// d'autorisation complet (rôle, niveau, permissions, restrictions).
// Utilisé par le client pour hydrater Zustand / React Query sans
// dépendre du SessionProvider côté serveur.
//
// OPTIMISATION PERFORMANCE :
// - Cache Redis des permissions/restrictions RBAC (TTL: 60s)
// - Évite les requêtes Prisma redondantes pour les résolutions RBAC
// - Cache invalidé automatiquement via le TTL court

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  normalizeRole,
  getRoleLevel,
  type AuthenticatedUser,
  type Role,
} from "@/lib/auth/rbac-shared";
import {
  resolveEffectivePermissions,
  resolveEffectiveRestrictions,
  type PermissionCode,
  type Restriction,
  type ToggleState,
} from "@/lib/auth/rbac";
import { getRedisClient } from "@/lib/redis";

// ─── Configuration route ───────────────────

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Headers de sécurité communs ─────────────

const SECURITY_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// ─── Type de la réponse ─────────────────────

export interface GetSessionResponse {
  success: boolean;
  isAuthenticated: boolean;
  user: AuthenticatedUser;
  role: Role;
  level: number;
  permissions: PermissionCode[];
  restrictions: Record<Restriction, string | ToggleState>;
  timestamp: number;
}

export interface GetSessionErrorResponse {
  success: false;
  isAuthenticated: false;
  error: string;
  code: string;
}

// ─── Cache Redis RBAC ────────────────────────

const RBAC_CACHE_TTL = 60; // 60 secondes

interface CachedRBAC {
  permissions: PermissionCode[];
  restrictions: Record<Restriction, string | ToggleState>;
  role: Role;
  level: number;
}

async function getCachedRBAC(role: Role): Promise<CachedRBAC | null> {
  try {
    const redis = getRedisClient();
    const cacheKey = `rbac:role:${role}`;
    const cached = await redis.get<CachedRBAC>(cacheKey);
    return cached;
  } catch {
    // Cache failure is non-blocking
    return null;
  }
}

async function setCachedRBAC(role: Role, data: CachedRBAC): Promise<void> {
  try {
    const redis = getRedisClient();
    const cacheKey = `rbac:role:${role}`;
    await redis.setex(cacheKey, RBAC_CACHE_TTL, data);
  } catch {
    // Cache failure is non-blocking
  }
}

async function resolveRBACWithCache(
  role: Role,
): Promise<{ permissions: PermissionCode[]; restrictions: Record<Restriction, string | ToggleState> }> {
  // Tentative de cache Redis
  const cached = await getCachedRBAC(role);
  if (cached) {
    return {
      permissions: cached.permissions,
      restrictions: cached.restrictions,
    };
  }

  // Cache miss → résolution DB + stockage en cache
  const [permissionsSet, restrictionsMap] = await Promise.all([
    resolveEffectivePermissions(role),
    resolveEffectiveRestrictions(role),
  ]);

  const permissions = Array.from(permissionsSet);
  const restrictions = Object.fromEntries(
    restrictionsMap,
  ) as Record<Restriction, string | ToggleState>;

  // Stockage asynchrone en cache (ne bloque pas la réponse)
  const rbacRole: Role = role;
  const rbacLevel: number = getRoleLevel(role);
  setCachedRBAC(rbacRole, {
    permissions,
    restrictions,
    role: rbacRole,
    level: rbacLevel,
  });

  // Retourne les données résolues
  const result: { permissions: PermissionCode[]; restrictions: Record<Restriction, string | ToggleState> } = {
    permissions,
    restrictions
  };
  return result;
}

// ═══════════════════════════════════════════
// HANDLER GET
// ═══════════════════════════════════════════

export async function GET(
  _request: NextRequest,
): Promise<NextResponse<GetSessionResponse | GetSessionErrorResponse>> {
  try {
    // 1. Récupération brute de la session Better-Auth
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          isAuthenticated: false,
          error: "Session invalide ou expirée.",
          code: "UNAUTHENTICATED",
        },
        { status: 401, headers: SECURITY_HEADERS },
      );
    }

    // 2. Extraction & normalisation du rôle
    const rawRole =
      (session.user as Record<string, unknown>).role ??
      (
        (session.user as Record<string, unknown>).metadata as Record<
          string,
          unknown
        >
      )?.role;

    const role: Role = normalizeRole(rawRole as string);
    const level = getRoleLevel(role);

    // 3. Résolution RBAC avec cache Redis (évite les requêtes Prisma redondantes)
    const { permissions, restrictions } = await resolveRBACWithCache(role);

    // 4. Construction de l'utilisateur typé
    const user: AuthenticatedUser = {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? null,
      role,
      level,
      image: (session.user as Record<string, unknown>).image as
        | string
        | null
        | undefined,
      emailVerified:
        ((session.user as Record<string, unknown>).emailVerified as boolean) ??
        false,
      createdAt: new Date(
        (session.user as Record<string, unknown>).createdAt as string,
      ),
      updatedAt: new Date(
        (session.user as Record<string, unknown>).updatedAt as string,
      ),
    };

    // 5. Réponse structurée
    const payload: GetSessionResponse = {
      success: true,
      isAuthenticated: true,
      user,
      role,
      level,
      permissions,
      restrictions,
      timestamp: Date.now(),
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    console.error("[API_GET_SESSION_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        isAuthenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur interne lors de la résolution de la session.",
        code: "INTERNAL_ERROR",
      },
      { status: 500, headers: SECURITY_HEADERS },
    );
  }
}
