// app/api/auth/sign-up/route.ts
// ============================================
// ROUTE API — INSCRIPTION UTILISATEUR (Sign-Up)
// ============================================
// Endpoint POST exposant l'inscription via Better-Auth avec :
// - Validation Zod des entrées
// - Rate limiting (3 req / 10 min par IP)
// - Audit logging (succès + échecs)
// - Logger structuré centralisé
// - Headers de sécurité stricts
// - Gestion d'erreurs standardisée

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

const signUpSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(100, "Le nom ne doit pas dépasser 100 caractères"),
  email: z
    .string()
    .email("Adresse email invalide")
    .max(255, "L'email ne doit pas dépasser 255 caractères"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128, "Le mot de passe ne doit pas dépasser 128 caractères"),
});

type SignUpInput = z.infer<typeof signUpSchema>;

// ─── Types de réponse ───────────────────────

export interface SignUpSuccessResponse {
  success: true;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  timestamp: number;
}

export interface SignUpErrorResponse {
  success: false;
  error: string;
  code: string;
  fields?: Record<string, string>;
}

export type SignUpResponse = SignUpSuccessResponse | SignUpErrorResponse;

// ─── Type pour le résultat de l'API BetterAuth signUp ──

interface SignUpApiResult {
  user?: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  session?: {
    id: string;
    expiresAt: string | Date;
  } | null;
  token?: string;
}

// ─── Helpers ────────────────────────────────

function sanitizeError(error: unknown): { message: string; code: string } {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    return {
      message: firstIssue?.message || "Données de validation invalides",
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof Error) {
    const msg = error.message;

    // BetterAuth known error messages (non-exhaustive)
    if (msg.includes("already exists") || msg.includes("User already exists")) {
      return {
        message: "Un compte avec cette adresse email existe déjà.",
        code: "EMAIL_ALREADY_EXISTS",
      };
    }
    if (msg.includes("Invalid email")) {
      return {
        message: "Adresse email invalide.",
        code: "INVALID_EMAIL",
      };
    }
    if (msg.includes("Password is too short")) {
      return {
        message: "Le mot de passe est trop court.",
        code: "WEAK_PASSWORD",
      };
    }
    if (msg.includes("Rate limit") || msg.includes("Too many")) {
      return {
        message:
          "Trop de tentatives. Veuillez réessayer dans quelques minutes.",
        code: "RATE_LIMITED",
      };
    }

    return {
      message: "Erreur lors de l'inscription. Veuillez réessayer.",
      code: "SIGNUP_ERROR",
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
): Promise<NextResponse<SignUpResponse>> {
  const correlationId = crypto.randomUUID();
  const requestStart = Date.now();

  // ── Logger context setup ──
  logger.setCorrelationId(correlationId);
  const logCtx = { source: "api/auth/sign-up", requestId: correlationId };

  try {
    // 1. Rate limiting — 3 req / 10 min (très strict pour l'inscription)
    const rateLimitResult = await checkRateLimit(request, {
      level: "GUEST",
      skipBurst: false,
    });

    if (!rateLimitResult.success) {
      logger.warn("Rate limit exceeded for sign-up", {
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
          path: "/api/auth/sign-up",
        },
        request,
        correlationId,
      }).catch(() => {});

      return NextResponse.json(
        {
          success: false,
          error: `Trop de tentatives. Réessayez dans ${rateLimitResult.retryAfter} secondes.`,
          code: "RATE_LIMITED",
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

    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const fieldName = issue.path.join(".");
        if (!fields[fieldName]) {
          fields[fieldName] = issue.message;
        }
      }

      logger.warn("Sign-up validation failed", {
        ...logCtx,
        meta: { fields: Object.keys(fields) },
      });

      return NextResponse.json(
        {
          success: false,
          error: "Données de validation invalides.",
          code: "VALIDATION_ERROR",
          fields,
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    const { name, email, password }: SignUpInput = parsed.data;

    // 3. Extraction des métadonnées de requête pour le contexte
    const headersList = await headers();
    const ipAddress: string | null =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      null;
    const userAgent: string | null = headersList.get("user-agent") ?? null;

    // 4. Appel à BetterAuth pour l'inscription
    logger.info("Attempting sign-up", {
      ...logCtx,
      meta: {
        email: email.replace(/(.{2})(.*)(@)/, "$1***$3"),
        ipAddress: ipAddress ?? "unknown",
        userAgent: userAgent?.slice(0, 128) ?? "unknown",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (await (auth.api as any).signUp.email({
      body: {
        name,
        email,
        password,
      },
      headers: headersList,
    })) as SignUpApiResult;

    // 5. Audit de succès
    const durationMs = Date.now() - requestStart;
    logger.info("Sign-up successful", {
      ...logCtx,
      userId: result.user?.id,
      durationMs,
      meta: {
        email: email.replace(/(.{2})(.*)(@)/, "$1***$3"),
        ipAddress: ipAddress ?? "unknown",
      },
    });

    void auditLog({
      eventType: UserEvent.LOGIN_SUCCESS,
      actorId: result.user?.id,
      actorLevel: "LEVEL_6",
      actorEmail: email,
      targetId: result.user?.id,
      targetType: "USER",
      metadata: {
        provider: "email-password",
        method: "signUp",
        ipAddress,
        userAgent: userAgent?.slice(0, 128),
      },
      request,
      correlationId,
    }).catch(() => {});

    // 6. Réponse standardisée
    const payload: SignUpSuccessResponse = {
      success: true,
      user: {
        id: result.user?.id ?? "",
        email: result.user?.email ?? email,
        name: result.user?.name ?? name,
      },
      timestamp: Date.now(),
    };

    return NextResponse.json(payload, {
      status: 201,
      headers: SECURITY_HEADERS,
    });
  } catch (error) {
    const durationMs = Date.now() - requestStart;
    const sanitized = sanitizeError(error);

    logger.error("Sign-up failed", error, {
      ...logCtx,
      durationMs,
      meta: { errorCode: sanitized.code },
    });

    // Audit de l'échec
    void auditLog({
      eventType: SecurityEvent.SUSPICIOUS_LOGIN_ATTEMPT,
      actorLevel: "GUEST",
      metadata: {
        errorCode: sanitized.code,
        errorMessage: sanitized.message,
        path: "/api/auth/sign-up",
      },
      request,
      correlationId,
    }).catch(() => {});

    const httpStatus =
      sanitized.code === "VALIDATION_ERROR"
        ? 400
        : sanitized.code === "RATE_LIMITED"
        ? 429
        : sanitized.code === "EMAIL_ALREADY_EXISTS"
        ? 409
        : 500;

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
