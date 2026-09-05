// lib/auth.ts
// Single BetterAuth instance (source of truth)

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

import { authDatabaseHooks } from "@/lib/better-auth/hooks";
import {
  hashPasswordWithBetterAuth,
  verifyBetterAuthPassword,
} from "@/lib/auth/password-hash";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/security/auth-rate-limit";
import { CHALLENGE_COOKIE_NAME, extractIP } from "@/lib/security/2fa";
import { customSession } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { hasPublicSignupPrivilegeFields } from "@/lib/auth/public-signup-schema";
import { getAuthCookiePrefix } from "@/lib/auth/session-cookie";

const COOKIE_PREFIX = getAuthCookiePrefix();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`[AUTH ENV ERROR] Missing environment variable: ${name}`);
  }
  return value;
}

const baseURL =
  process.env.APP_URL ??
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "http://localhost:3000";

const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      process.env.APP_URL,
      process.env.BETTER_AUTH_URL,
      process.env.NEXT_PUBLIC_BASE_URL,
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:3000",
      "https://127.0.0.1:3000",
    ].filter((value): value is string => !!value && value.trim().length > 0)
  )
);

if (process.env.NODE_ENV === "production" && baseURL.includes("localhost")) {
  throw new Error("[AUTH ERROR] Invalid production baseURL.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  baseURL,
  databaseHooks: authDatabaseHooks,
  advanced: {
    cookiePrefix: COOKIE_PREFIX,
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false,
    password: {
      hash: hashPasswordWithBetterAuth,
      verify: verifyBetterAuthPassword,
    },
  },
  user: {
    // Role is managed via Prisma schema and enriched in session via customSession
  },
  socialProviders: {
    google: {
      enabled:
        !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
    facebook: {
      enabled:
        !!process.env.FACEBOOK_CLIENT_ID &&
        !!process.env.FACEBOOK_CLIENT_SECRET,
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          roleAssignment: {
            select: {
              id: true,
              assignedAt: true,
              roleConfig: { select: { role: true, level: true, permissions: true } },
            },
          },
        },
      });

      if (!dbUser) return { user, session };

      return {
        user: {
          ...user,
          role: dbUser.roleAssignment?.roleConfig.role ?? "GUEST",
          level: dbUser.roleAssignment?.roleConfig.level ?? 7,
          roleAssignment: dbUser.roleAssignment,
        },
        session,
      };
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins,
  // ═══════════════════════════════════════════════════════════
  // HOOKS : Rate Limiter + 2FA Challenge + Audit
  // ═══════════════════════════════════════════════════════════
  hooks: {
    // ─── BEFORE : Refuse les privilèges fournis par un client ──
    before: createAuthMiddleware(async (ctx) => {
      if (
        (ctx.path === "/sign-up/email" || ctx.path === "/sign-up") &&
        hasPublicSignupPrivilegeFields(ctx.body)
      ) {
        return new Response(
          JSON.stringify({
            error:
              "role et level ne peuvent pas être définis lors de l'inscription.",
            code: "FORBIDDEN_SIGNUP_FIELDS",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (ctx.path !== "/sign-in/email") return;

      const body = ctx.body as Record<string, unknown> | undefined;
      const email = String(body?.email || "")
        .toLowerCase()
        .trim();
      if (!email) return;

      const ip = ctx.request ? extractIP(ctx.request) : "unknown";

      // Vérification rate limit
      const rateLimit = await checkLoginRateLimit({ email, ip });
      if (!rateLimit.allowed) {
        // Comptabiliser la tentative bloquée
        await recordLoginAttempt({ email, ip, success: false });

        // Court-circuiter Better-Auth avec 429
        return new Response(
          JSON.stringify({
            error: rateLimit.message,
            code: "TOO_MANY_REQUESTS",
            retryAfter: rateLimit.retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(rateLimit.retryAfter || 900),
            },
          }
        );
      }
    }),

    // ─── AFTER : Audit + 2FA challenge ─────────────────────
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email") return;

      const body = ctx.body as Record<string, unknown> | undefined;
      const email = String(body?.email || "")
        .toLowerCase()
        .trim();

      const ip = ctx.request ? extractIP(ctx.request) : "unknown";
      const userAgent = ctx.request?.headers?.get("user-agent") || "unknown";

      // 1. Enregistrer le résultat (succès ou échec mot de passe)
      const session = ctx.context.session;
      const success = !!session;
      if (email) {
        await recordLoginAttempt({ email, ip, success });
      }

      // Si l'authentification a échoué (mauvais mot de passe), on s'arrête ici
      if (!session?.user?.id) return;

      // 2. Vérifier si l'utilisateur est SUPER_ADMIN
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          roleAssignment: { include: { roleConfig: { select: { role: true } } } },
          userSecurities: { select: { twoFactorEnabled: true } },
        },
      });

      const isSuperAdmin = user?.roleAssignment?.roleConfig?.role === "SUPER_ADMIN";
      const has2FA = user?.userSecurities?.[0]?.twoFactorEnabled ?? false;

      // Non SUPER_ADMIN → connexion normale, on garde la session
      if (!isSuperAdmin) return;

      // SUPER_ADMIN avec 2FA activé → challenge 2FA obligatoire
      if (has2FA) {
        // 🔒 SUPPRESSION de la session fraîchement créée
        try {
          await prisma.session.delete({ where: { id: session.session.id } });
        } catch {
          // Session déjà supprimée ou inexistante
        }

        // Création du challenge 2FA (5 min, usage unique)
        const challengeToken = crypto.randomUUID();
        await prisma.verification.create({
          data: {
            id: crypto.randomUUID(),
            identifier: session.user.id,
            value: challengeToken,
            type: "TWO_FACTOR",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            attemptCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Nettoyer le cookie de session et injecter le cookie challenge
        const sessionCookieName = `${COOKIE_PREFIX}.session_token`;
        // Effacer le cookie de session
        ctx.setCookie(sessionCookieName, "", {
          maxAge: 0,
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        });
        // Définir le cookie challenge
        ctx.setCookie(CHALLENGE_COOKIE_NAME, challengeToken, {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          maxAge: 300,
          path: "/",
        });

        // Marquer la réponse pour que le client sache qu'il faut 2FA
        if (ctx.context.returned && typeof ctx.context.returned === "object") {
          (ctx.context.returned as Record<string, unknown>).requires2FA = true;
        }

        // Audit log : non bloquant pour ne pas rallonger la réponse auth.
        void prisma.auditLog
          .create({
            data: {
              id: crypto.randomUUID(),
              userId: session.user.id,
              roleLevel: 7,
              action: "LOGIN_2FA_CHALLENGE",
              targetType: "USER",
              targetId: session.user.id,
              details: JSON.stringify({
                reason: "SUPER_ADMIN_2FA_REQUIRED",
                ipAddress: ip,
                userAgent,
                timestamp: new Date().toISOString(),
              }),
              ipAddress: ip,
              userAgent,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
          .catch(() => {
            // Non-blocking
          });
      }
      // SUPER_ADMIN sans 2FA → session conservée, redirigé par layout vers /admin/setup-2fa
    }),
  },
});
