// lib/security/auth-rate-limit.ts
// Rate limiting for authentication routes (login + 2FA verification)
// Uses Prisma-backed counters with sliding windows.
// NEVER throws — always returns a result object.

import { prisma } from "@/lib/prisma";

const RATE_LIMIT = {
  loginWindowMs: 15 * 60 * 1000, // 15 minutes
  maxLoginPerIp: 10,
  maxLoginPerEmail: 5,
  twoFAWindowMs: 15 * 60 * 1000, // 15 minutes
  max2FAPerIp: 5,
};

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
  retryAfter?: number; // seconds
}

// ─── Login Rate Limit ────────────────────────────────────

export async function checkLoginRateLimit({
  email,
  ip,
}: {
  email: string;
  ip: string;
}): Promise<RateLimitResult> {
  const since = new Date(Date.now() - RATE_LIMIT.loginWindowMs);

  try {
    // By IP
    const ipCount = await prisma.loginAttempt.count({
      where: { ipAddress: ip, createdAt: { gte: since } },
    });
    if (ipCount >= RATE_LIMIT.maxLoginPerIp) {
      return {
        allowed: false,
        message: "Trop de tentatives. Réessaie dans 15 minutes.",
        retryAfter: Math.ceil(RATE_LIMIT.loginWindowMs / 1000),
      };
    }

    // By email
    const normalizedEmail = email.toLowerCase().trim();
    const emailCount = await prisma.loginAttempt.count({
      where: { email: normalizedEmail, createdAt: { gte: since } },
    });
    if (emailCount >= RATE_LIMIT.maxLoginPerEmail) {
      return {
        allowed: false,
        message: "Trop de tentatives. Réessaie dans 15 minutes.",
        retryAfter: Math.ceil(RATE_LIMIT.loginWindowMs / 1000),
      };
    }
  } catch (err) {
    console.error("[RATE-LIMIT] checkLoginRateLimit error:", err);
    // Fail open — allow login if DB is down
  }

  return { allowed: true };
}

export async function recordLoginAttempt({
  email,
  ip,
  success,
}: {
  email: string;
  ip: string;
  success: boolean;
}): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        ipAddress: ip,
        success,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[RATE-LIMIT] recordLoginAttempt error:", err);
  }
}

// ─── 2FA Verify Rate Limit ───────────────────────────────

export async function checkTwoFARateLimit(ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - RATE_LIMIT.twoFAWindowMs);

  try {
    const count = await prisma.twoFactorAttempt.count({
      where: { ipAddress: ip, createdAt: { gte: since } },
    });

    if (count >= RATE_LIMIT.max2FAPerIp) {
      return {
        allowed: false,
        message: "Trop de tentatives de vérification 2FA. Réessaie dans 15 minutes.",
        retryAfter: Math.ceil(RATE_LIMIT.twoFAWindowMs / 1000),
      };
    }
  } catch (err) {
    console.error("[RATE-LIMIT] checkTwoFARateLimit error:", err);
  }

  return { allowed: true };
}

export async function recordTwoFAAttempt(ip: string, success: boolean): Promise<void> {
  try {
    await prisma.twoFactorAttempt.create({
      data: {
        id: crypto.randomUUID(),
        ipAddress: ip,
        success,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[RATE-LIMIT] recordTwoFAAttempt error:", err);
  }
}
