// lib/security/2fa.ts
// Shared 2FA helpers for challenge/verification flow

import { prisma } from "@/lib/prisma";

const COOKIE_PREFIX = process.env.BETTER_AUTH_COOKIE_PREFIX || "better-auth";

/**
 * Cookie name for the 2FA challenge token.
 * Uses __Host- prefix for production (secure, path=/), falls back for dev.
 */
export const CHALLENGE_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-2fa"
    : `${COOKIE_PREFIX}.2fa_challenge`;

export const CHALLENGE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 300, // 5 minutes
  path: "/",
};

/**
 * Check if a user is a SUPER_ADMIN.
 */
export async function isSuperAdminUser(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleConfig: { select: { role: true } },
      },
    });
    return user?.roleConfig?.role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

/**
 * Check if a user has 2FA enabled.
 */
export async function has2FAEnabled(userId: string): Promise<boolean> {
  try {
    const security = await prisma.userSecurity.findUnique({
      where: { userId },
      select: { twoFactorEnabled: true },
    });
    return security?.twoFactorEnabled ?? false;
  } catch {
    return false;
  }
}

/**
 * Extract IP from request headers.
 */
export function extractIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Extract IP from a headers object.
 */
export function extractIPFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
