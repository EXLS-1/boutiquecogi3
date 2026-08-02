// lib/better-auth/hooks.ts
// Hooks de base de données BetterAuth pour publier des événements métier

import { publishAuthBusinessEvent } from "@/lib/better-auth-events";

type HookUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
} & Record<string, unknown>;

type HookSession = {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
} & Record<string, unknown>;

function safeString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.trim().length ? s : null;
}

function extractIp(
  context: { request?: Request | null } | null
): string | null {
  if (!context?.request) return null;
  const ip =
    context.request.headers.get("x-forwarded-for") ??
    context.request.headers.get("x-real-ip") ??
    context.request.headers.get("cf-connecting-ip") ??
    null;
  return safeString(ip);
}

function extractUserAgent(
  context: { request?: Request | null } | null
): string | null {
  if (!context?.request) return null;
  return safeString(context.request.headers.get("user-agent"));
}

/**
 * Database hooks BetterAuth.
 * Publie des événements métier vers prisma.auditLog via les hooks
 * de cycle de vie de base de données (create/delete sur user et session).
 */
export const authDatabaseHooks = {
  user: {
    create: {
      after: async (
        user: HookUser,
        context: { request?: Request | null } | null
      ) => {
        void publishAuthBusinessEvent({
          action: "AUTH_SIGN_UP",
          entityType: "USER",
          entityId: user.id,
          userId: user.id,
          ip: extractIp(context),
          userAgent: extractUserAgent(context),
          metadata: {
            email: user.email,
            provider: "email-password",
          },
        }).catch((err) => {
          console.error("[AUTH_HOOK] afterSignUp failed (non-blocking):", err);
        });
      },
    },
  },
  session: {
    create: {
      after: async (
        session: HookSession,
        context: { request?: Request | null } | null
      ) => {
        void publishAuthBusinessEvent({
          action: "AUTH_SIGN_IN",
          entityType: "SESSION",
          entityId: session.id,
          userId: session.userId,
          ip: extractIp(context),
          userAgent: extractUserAgent(context),
          metadata: {
            strategy: "email-password",
          },
        }).catch((err) => {
          console.error("[AUTH_HOOK] afterSignIn failed (non-blocking):", err);
        });
      },
    },
    delete: {
      after: async (session: HookSession) => {
        void publishAuthBusinessEvent({
          action: "AUTH_SIGN_OUT",
          entityType: "SESSION",
          entityId: session.id,
          userId: session.userId,
          ip: null,
          userAgent: null,
          metadata: {},
        }).catch((err) => {
          console.error("[AUTH_HOOK] afterSignOut failed (non-blocking):", err);
        });
      },
    },
  },
};
