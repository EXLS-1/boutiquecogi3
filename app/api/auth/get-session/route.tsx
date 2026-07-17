// app/api/auth/get-session/route.tsx
// ============================================
// ROUTE API — RÉCUPÉRATION SESSION + CONTEXTE RBAC
// ============================================
// Endpoint GET exposant la session Better-Auth enrichie du contexte
// d'autorisation complet (rôle, niveau, permissions, restrictions).
// Utilisé par le client pour hydrater Zustand / React Query sans
// dépendre du SessionProvider côté serveur.

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

    // 3. Résolution parallèle du contexte RBAC
    const [permissionsSet, restrictionsMap] = await Promise.all([
      resolveEffectivePermissions(role),
      resolveEffectiveRestrictions(role),
    ]);

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

    // 5. Sérialisation des Set/Map pour JSON
    const permissions = Array.from(permissionsSet);
    const restrictions = Object.fromEntries(
      restrictionsMap,
    ) as Record<Restriction, string | ToggleState>;

    // 6. Réponse structurée
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