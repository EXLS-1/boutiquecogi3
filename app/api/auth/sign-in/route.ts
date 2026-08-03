// app/api/auth/sign-in/route.ts
// ============================================
// ROUTE API — CONNEXION UTILISATEUR (Sign-In)
// ============================================
// Endpoint POST exposant la connexion via Better-Auth avec :
// - Validation Zod des entrées
// - Rate limiting (5 req / 5 min par IP + burst control)
// - Détection de force brute et audit logging
// - Logger structuré centralisé
// - Headers de sécurité stricts
// - Gestion d'erreurs standardisée sans fuite d'information

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { auditLog, UserEvent, SecurityEvent } from "@/lib/security/audit";

// ─── Configuration route ───────────────────

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ─── Headers de sécurité communs ─────────────

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

// ─── Schéma de validation Zod ───────────────

const signInSchema = z.object({
  email: z
    .string()
    .email("Adresse email invalide")
    .max(255, "L'email ne doit pas dépasser 255 caractères"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
});

type SignInInput = z.infer<typeof signInSchema>;

// ─── Types de réponse ───────────────────────

export interface SignInSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
  timestamp: number;
}

export interface SignInErrorResponse {
  success: false;
  error: string;
  code: string;
  retryAfter?: number;
}

export type SignInResponse = SignInSuccessResponse | SignInErrorResponse;

// ─── Compteur de tentatives échouées (mémoire process) ──
// Utilisé pour détecter les patterns de force brute.
// En production, utilisez Redis pour le partage inter-instances.

const FAILED_ATTEMPT_THRESHOLD = 5; // Déclenche une alerte après 5 échecs consécutifs
const BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const failedAttempts = new Map<
  string,
  { count: number; firstAttempt: number; lastAttempt: number }
>();

function trackFailedAttempt(identifier: string): number {
  const now = Date.now();
  const existing = failedAttempts.get(identifier);

  if (!existing || now - existing.firstAttempt > BRUTE_FORCE_WINDOW_MS) {
    failedAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
    });
    return 1;
  }

  existing.count += 1;
  existing.lastAttempt = now;
  return existing.count;
}

function cleanupFailedAttempts(): void {
  const now = Date.now();
  for (const [key, value] of failedAttempts.entries()) {
    if (now - value.firstAttempt > BRUTE_FORCE_WINDOW_MS) {
      failedAttempts.delete(key);
    }
  }
}

// Nettoyage périodique toutes les 5 minutes
setInterval(cleanupFailedAttempts, 5 * 60 * 1000);

// ─── Helpers ────────────────────────────────

function sanitizeSignInError(error: unknown): {
  message: string;
  code: string;
} {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    return {
      message: firstIssue?.message || "Données de validation invalides",
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof Error) {
    const msg = error.message;

    // BetterAuth known error messages — on NE divulgue PAS si l'email existe
    if (
      msg.includes("Invalid credentials") ||
      msg.includes("Invalid email or password") ||
      msg.includes("User not found") ||
      msg.includes("Invalid password")
    ) {
      return {
        message: "Email ou mot de passe incorrect.",
        code: "INVALID_CREDENTIALS",
      };
    }
    if (msg.includes("Rate limit") || msg.includes("Too many")) {
      return {
        message:
          "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
        code: "RATE_LIMITED",
      };
    }
    if (msg.includes("Account is blocked") || msg.includes("blocked")) {
      return {
        message: "Ce compte est temporairement bloqué. Contactez le support.",
        code: "ACCOUNT_BLOCKED",
      };
    }

    return {
      message: "Email ou mot de passe incorrect.",
      code: "INVALID_CREDENTIALS",
    };
  }

  return {
    message: "Erreur interne inattendue.",
    code: "INTERNAL_ERROR",
  };
}

// ═══════════════════════════════════════════
// HANDLER POST
// ═══════════════════════════════════════════

export async function POST(
  request: NextRequest
): Promise<NextResponse<SignInResponse>> {
  const correlationId = crypto.randomUUID();
  const requestStart = Date.now();

  // ── Logger context setup ──
  logger.setCorrelationId(correlationId);
  const logCtx = { source: "api/auth/sign-in", requestId: correlationId };

  try {
    // 1. Rate limiting — 5 req / 5 min avec burst control
    const rateLimitResult = await checkRateLimit(request, {
      level: "GUEST",
      skipBurst: false,
    });

    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for sign-in", {
        ...logCtx,
        meta: {
          identifier: rateLimitResult.identifier,
          retryAfter: rateLimitResult.retryAfter,
        },
      });

      void auditLog({
        eventType: SecurityEvent.RATE_LIMIT_EXCEEDED,
        actorLevel: "GUEST",
        metadata: {
          identifier: rateLimitResult.identifier,
          retryAfter: rateLimitResult.retryAfter,
          path: "/api/auth/sign-in",
          isBurst: rateLimitResult.isBurst,
        },
        request,
        correlationId,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: `Trop de tentatives. Réessayez dans ${rateLimitResult.retryAfter} secondes.`,
          code: "RATE_LIMITED",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            ...SECURITY_HEADERS,
            "Retry-After": String(rateLimitResult.retryAfter),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      );
    }

    // 2. Validation du corps de la requête
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Corps de la requête invalide. JSON attendu.",
          code: "INVALID_JSON",
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path.join(".");
        if (!fields[fieldName]) {
          fields[fieldName] = issue.message;
        }
      }

      logger.warn("Sign-in validation failed", {
        ...logCtx,
        meta: { fields: Object.keys(fields) },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Données de validation invalides.",
          code: "VALIDATION_ERROR",
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { email, password }: SignInInput = parsed.data;

    // 3. Extraction des métadonnées de requête
    const headersList = await headers();
    const ipAddress: string | null =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      null;
    const userAgent: string | null = headersList.get("user-agent") ?? null;

    // Identifiant unique pour le suivi de force brute
    const bruteForceId = `signin:${
      ipAddress || "unknown"
    }:${email.toLowerCase()}`;

    // 4. Appel à BetterAuth pour la connexion
    logger.info("Attempting sign-in", {
      ...logCtx,
      meta: {
        email: email.replace(/(.{2})(.*)(@)/, "$1***$3"),
        ipAddress: ipAddress ?? "unknown",
        userAgent: userAgent?.slice(0, 128) ?? "unknown",
      },
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (auth.api as any).signInEmail({
      body: {
        email,
        password,
      },
      headers: headersList,
    }) as {
      user?: { id: string; email: string; name: string | null; role?: string };
      session?: { id: string; expiresAt: string | Date };
    } | null;

    // 5. Succès — réinitialiser le compteur d'échecs + audit
    failedAttempts.delete(bruteForceId);

    const durationMs = Date.now() - requestStart;

    const userId = result?.user?.id ?? "";
    const userRole = result?.user?.role ?? "USER";
    const sessionId = result?.session?.id ?? "";
    const sessionExpires =
      result?.session?.expiresAt instanceof Date
        ? result.session.expiresAt.toISOString()
        : typeof result?.session?.expiresAt === "string"
        ? result.session.expiresAt
        : new Date().toISOString();

    logger.info("Sign-in successful", {
      ...logCtx,
      userId,
      durationMs,
    });

    void auditLog({
      eventType: UserEvent.LOGIN_SUCCESS,
      actorId: userId,
      actorLevel: "LEVEL_6",
      actorEmail: email,
      sessionId,
      targetId: userId,
      targetType: "USER",
      metadata: {
        provider: "email-password",
        method: "signIn",
      },
      request,
      correlationId,
    }).catch(() => {});

    // 6. Réponse standardisée
    const payload: SignInSuccessResponse = {
      success: true,
      user: {
        id: userId,
        email: result?.user?.email ?? email,
        name: result?.user?.name ?? null,
        role: userRole,
      },
      session: {
        id: sessionId,
        expiresAt: sessionExpires,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    const durationMs = Date.now() - requestStart;

    // Extraire l'IP depuis les headers
    let attemptIp = "unknown";
    try {
      const headersList2 = await headers();
      attemptIp =
        headersList2.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        headersList2.get("x-real-ip") ??
        "unknown";
    } catch {
      // ignore
    }

    const sanitized = sanitizeSignInError(error);

    // Ne PAS logger l'email en clair dans les logs d'erreur, seulement le code
    logger.error("Sign-in failed", error, {
      ...logCtx,
      durationMs,
      meta: { errorCode: sanitized.code },
    });

    // Suivi des tentatives échouées pour détection de force brute (basé sur IP uniquement)
    const bruteForceId = `signin:${attemptIp}`;
    const failCount = trackFailedAttempt(bruteForceId);

    // Si force brute détectée, alerte de sécurité
    if (failCount >= FAILED_ATTEMPT_THRESHOLD) {
      void auditLog({
        eventType: SecurityEvent.BRUTE_FORCE_DETECTED,
        actorLevel: "GUEST",
        metadata: {
          failCount,
          threshold: FAILED_ATTEMPT_THRESHOLD,
          path: "/api/auth/sign-in",
          ip: attemptIp,
        },
        request,
        correlationId,
      }).catch(() => {});
    } else {
      // Audit de l'échec standard
      void auditLog({
        eventType: SecurityEvent.SUSPICIOUS_LOGIN_ATTEMPT,
        actorLevel: "GUEST",
        metadata: {
          errorCode: sanitized.code,
          failCount,
          threshold: FAILED_ATTEMPT_THRESHOLD,
          path: "/api/auth/sign-in",
        },
        request,
        correlationId,
      }).catch(() => {});
    }

    const httpStatus =
      sanitized.code === "VALIDATION_ERROR"
        ? 400
        : sanitized.code === "RATE_LIMITED"
        ? 429
        : sanitized.code === "ACCOUNT_BLOCKED"
        ? 403
        : 401;

    return NextResponse.json(
      {
        success: false,
        error: sanitized.message,
        code: sanitized.code,
      },
      { status: httpStatus, headers: SECURITY_HEADERS }
    );
  } finally {
    logger.clearCorrelationId();
  }
}
