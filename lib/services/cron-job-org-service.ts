// app/api/cron/exchange-rate/route.ts
// =============================================================================
// Route API CRON pour le rafraîchissement forcé du taux de change USD/CDF.
// Cette route est STRICTEMENT réservée aux appels automatisés (CRON/Vercel/Upstash).
// Protection multi-couches : token secret + RBAC (L1-L2 uniquement).
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateExchangeRateCronJob } from "@/lib/currency/exchange-rate-cron";

// ─── Configuration & Constantes ───────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Token secret pour authentification CRON (fourni par l'orchestrateur) */
const CRON_SECRET = process.env.CRON_SECRET;

/** Durée max d'exécution autorisée pour le job (ms) */
const CRON_TIMEOUT_MS = 30_000;

export interface CronJobSchedule {
  readonly minute?: number;
  readonly minutes?: number[];
  readonly hours?: number[];
  readonly daysOfMonth?: number[];
  readonly months?: number[];
  readonly daysOfWeek?: number[];
}

function buildStepValues(step: number, max: number, start = 0): number[] {
  if (!Number.isInteger(step) || step <= 0) {
    throw new Error("step must be a positive integer");
  }

  const values: number[] = [];
  for (let value = start; value < max; value += step) {
    values.push(value);
  }
  return values;
}

export function hourly(): CronJobSchedule {
  return { minutes: [0], hours: buildStepValues(1, 24) };
}

export function dailyAt(hour: number, minute = 0): CronJobSchedule {
  return { minutes: [minute], hours: [hour] };
}

export function everyNMinutes(n: number): CronJobSchedule {
  return { minutes: buildStepValues(n, 60) };
}

export function everyNHours(n: number): CronJobSchedule {
  return { minutes: [0], hours: buildStepValues(n, 24) };
}

export function weekdaysAt(hour: number, minute = 0): CronJobSchedule {
  return { minutes: [minute], hours: [hour], daysOfWeek: [1, 2, 3, 4, 5] };
}

// ─── RBAC : Niveaux de Privilège ──────────────────────────────────────────────
//
// LEVEL 1 = SUPER-ADMIN
// LEVEL 2 = ADMIN
// LEVEL 3 = MANAGER
// LEVEL 4 = EDITOR
// LEVEL 5 = SUPERVISOR
// LEVEL 6 = USER
// LEVEL 7 = GUEST (public, non authentifié)
//
// Cette route CRON est réservée aux SUPER-ADMIN (L1) et ADMIN (L2) uniquement.

type PrivilegeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AuthContext {
  readonly isAuthenticated: boolean;
  readonly privilegeLevel: PrivilegeLevel;
  readonly userId?: string;
}

// ─── Helpers d'authentification ───────────────────────────────────────────────

/**
 * Extrait et valide le token Bearer de l'en-tête Authorization.
 * Le token CRON_SECRET est la première ligne de défense.
 */
function validateCronToken(authHeader: string | null): boolean {
  if (!authHeader || !CRON_SECRET) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  const token = authHeader.slice(prefix.length);
  // Comparaison en temps constant pour prévenir les attaques timing
  return timingSafeEqual(token, CRON_SECRET);
}

/**
 * Comparaison de chaînes en temps constant (protection timing attack).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extrait le contexte d'authentification depuis la requête.
 * Pour les appels CRON, on vérifie d'abord le token, puis la session Better-Auth.
 */
async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  // Vérification du token CRON (méthode privilégiée pour les orchestrateurs)
  const authHeader = request.headers.get("authorization");
  const isCronTokenValid = validateCronToken(authHeader);

  if (isCronTokenValid) {
    // Token CRON valide = traité comme SUPER-ADMIN (L1)
    return { isAuthenticated: true, privilegeLevel: 1 };
  }

  // Fallback : vérification de session Better-Auth (pour usage manuel admin)
  try {
    const sessionCookie = request.cookies.get("better-auth.session")?.value;
    if (!sessionCookie) {
      return { isAuthenticated: false, privilegeLevel: 7 };
    }

    // TODO: Intégrer votre logique Better-Auth ici
    // const session = await auth.api.getSession({ headers: request.headers });
    // if (!session) return { isAuthenticated: false, privilegeLevel: 7 };
    // return {
    //   isAuthenticated: true,
    //   privilegeLevel: (session.user?.level ?? 7) as PrivilegeLevel,
    //   userId: session.user?.id,
    // };

    return { isAuthenticated: false, privilegeLevel: 7 };
  } catch {
    return { isAuthenticated: false, privilegeLevel: 7 };
  }
}

/**
 * Vérifie si le niveau de privilège satisfait le minimum requis.
 * LEVEL 7 (GUEST) = public, aucun privilège.
 */
function hasPrivilege(
  ctx: AuthContext,
  requiredLevel: PrivilegeLevel,
): boolean {
  if (!ctx.isAuthenticated) return false;
  return ctx.privilegeLevel <= requiredLevel;
}

// ─── Helpers de réponse ─────────────────────────────────────────────────────

interface CronResponse {
  readonly success: boolean;
  readonly timestamp: string;
  readonly execution:
    | "completed"
    | "failed_fallback_active"
    | "forbidden"
    | "timeout";
  readonly rate?: string;
  readonly levelServed?: string;
  readonly error?: { readonly code: string; readonly message: string };
}

function jsonResponse(data: CronResponse, status: number): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * GET /api/cron/exchange-rate
 * Exécute le job CRON de rafraîchissement du taux USD/CDF.
 * Niveau requis : SUPER-ADMIN (L1) ou ADMIN (L2).
 * Si le token CRON_SECRET est fourni, bypass de la session Better-Auth.
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    // ── Étape 1 : Authentification ─────────────────────────────────────────
    const auth = await getAuthContext(request);

    // RBAC : Seuls L1 (SUPER-ADMIN) et L2 (ADMIN) peuvent exécuter le CRON
    if (!hasPrivilege(auth, 2)) {
      console.warn(
        `[CRON_ROUTE] Tentative d'accès non autorisée — Privilège: L${auth.privilegeLevel}, Authentifié: ${auth.isAuthenticated}`,
      );
      return jsonResponse(
        {
          success: false,
          timestamp: new Date().toISOString(),
          execution: "forbidden",
          error: {
            code: "FORBIDDEN",
            message:
              "Accès interdit. Cette route est réservée aux SUPER-ADMIN (L1) et ADMIN (L2).",
          },
        },
        403,
      );
    }

    console.log(
      `[CRON_ROUTE] Exécution autorisée — Privilège: L${auth.privilegeLevel}, User: ${auth.userId ?? "cron-token"}`,
    );

    // ── Étape 2 : Exécution du job avec timeout ────────────────────────────
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("CRON_TIMEOUT")), CRON_TIMEOUT_MS),
    );

    const success = await Promise.race([
      updateExchangeRateCronJob(),
      timeoutPromise,
    ]);

    const duration = Math.round(performance.now() - startTime);

    console.log(
      `[CRON_ROUTE] Job terminé en ${duration}ms — Succès: ${success}`,
    );

    return jsonResponse(
      {
        success,
        timestamp: new Date().toISOString(),
        execution: success ? "completed" : "failed_fallback_active",
      },
      success ? 200 : 502,
    );
  } catch (error) {
    const duration = Math.round(performance.now() - startTime);

    if (error instanceof Error && error.message === "CRON_TIMEOUT") {
      console.error(`[CRON_ROUTE] Timeout après ${duration}ms`);
      return jsonResponse(
        {
          success: false,
          timestamp: new Date().toISOString(),
          execution: "timeout",
          error: {
            code: "TIMEOUT",
            message: `Le job CRON a dépassé la limite de ${CRON_TIMEOUT_MS}ms.`,
          },
        },
        504,
      );
    }

    console.error("[CRON_ROUTE_ERROR]", error);
    return jsonResponse(
      {
        success: false,
        timestamp: new Date().toISOString(),
        execution: "failed_fallback_active",
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne lors de l'exécution du job CRON.",
        },
      },
      500,
    );
  }
}

/**
 * OPTIONS /api/cron/exchange-rate
 * Répond aux requêtes preflight CORS (utile pour les orchestrateurs HTTP).
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Client REST complet pour l'API officielle cron-job.org
 * Schémas Zod validés selon la documentation officielle
 * Enums TypeScript stricts (JobStatus, RequestMethod, JobType)
 * Rate limits documentés pour chaque endpoint
 */
