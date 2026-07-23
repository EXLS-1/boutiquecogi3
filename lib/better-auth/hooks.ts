// lib/better-auth/hooks.ts

import { publishAuthBusinessEvent } from "@/lib/better-auth-events";

type HookContext = {
  user?: { id?: string; email?: string } | null;
  profile?: { id?: string; email?: string } | null;
  account?: { provider?: string; providerAccountId?: string } | null;
  session?: {
    id?: string;
    sessionToken?: string;
    provider?: string;
  } | null;
  request?: {
    ip?: string;
    headers?: { get?: (name: string) => string | null };
    userAgent?: string;
  } | null;
};

function safeString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.trim().length ? s : null;
}

/**
 * Hooks BetterAuth.
 * On publie des événements métier vers prisma.auditLog.
 */
export const authHooks = {
  async afterSignUp(ctx: HookContext) {
    const userId = ctx.user?.id ?? ctx.profile?.id ?? null;

    // Fire-and-forget: ne bloque pas le flux d'authentification
    publishAuthBusinessEvent({
      action: "AUTH_SIGN_UP",
      entityType: "USER",
      entityId: userId,
      userId: ctx.user?.id ?? null,
      ip: safeString(ctx.request?.ip),
      userAgent: safeString(
        ctx.request?.headers?.get?.("user-agent") ?? ctx.request?.userAgent
      ),
      metadata: {
        email:
          ctx.user?.email ??
          ctx.profile?.email ??
          ctx.account?.providerAccountId ??
          null,
        provider: ctx.account?.provider ?? null,
      },
    }).catch((err) => {
      console.error("[AUTH_HOOK] afterSignUp failed (non-blocking):", err);
    });
  },

  async afterSignIn(ctx: HookContext) {
    const sessionId = ctx.session?.id ?? ctx.session?.sessionToken ?? null;

    // Fire-and-forget: ne bloque pas le flux d'authentification
    publishAuthBusinessEvent({
      action: "AUTH_SIGN_IN",
      entityType: "SESSION",
      entityId: sessionId,
      userId: ctx.user?.id ?? null,
      ip: safeString(ctx.request?.ip),
      userAgent: safeString(
        ctx.request?.headers?.get?.("user-agent") ?? ctx.request?.userAgent
      ),
      metadata: {
        email: ctx.user?.email ?? null,
        strategy: ctx.session?.provider ?? null,
      },
    }).catch((err) => {
      console.error("[AUTH_HOOK] afterSignIn failed (non-blocking):", err);
    });
  },

  async afterSignOut(ctx: HookContext) {
    const sessionId = ctx.session?.id ?? ctx.session?.sessionToken ?? null;

    // Fire-and-forget: ne bloque pas le flux d'authentification
    publishAuthBusinessEvent({
      action: "AUTH_SIGN_OUT",
      entityType: "SESSION",
      entityId: sessionId,
      userId: ctx.user?.id ?? null,
      ip: safeString(ctx.request?.ip),
      userAgent: safeString(
        ctx.request?.headers?.get?.("user-agent") ?? ctx.request?.userAgent
      ),
      metadata: {
        email: ctx.user?.email ?? null,
      },
    }).catch((err) => {
      console.error("[AUTH_HOOK] afterSignOut failed (non-blocking):", err);
    });
  },
};
