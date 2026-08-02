import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { checkTwoFARateLimit, recordTwoFAAttempt } from "@/lib/security/auth-rate-limit";
import { sendEmail, buildSuperAdminLoginEmail } from "@/lib/email";

const MAX_CHALLENGE_ATTEMPTS = 3;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const challengeToken = cookieStore.get("__Host-2fa")?.value;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Rate limit IP
  const ipLimit = await checkTwoFARateLimit(ip);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: ipLimit.message, code: "TOO_MANY_REQUESTS", retryAfter: ipLimit.retryAfter },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter || 900) } }
    );
  }

  if (!challengeToken) {
    await recordTwoFAAttempt(ip, false);
    return NextResponse.json({ error: "Session 2FA introuvable. Reconnecte-toi." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { code } = body;
  if (!code || typeof code !== "string") {
    await recordTwoFAAttempt(ip, false);
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  const verification = await prisma.verification.findFirst({
    where: { value: challengeToken, type: "TWO_FACTOR", consumedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!verification) {
    await recordTwoFAAttempt(ip, false);
    cookieStore.set("__Host-2fa", "", { maxAge: 0, path: "/" });
    return NextResponse.json({ error: "Challenge expiré ou invalide. Reconnecte-toi." }, { status: 400 });
  }

  if (verification.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
    await prisma.verification.delete({ where: { id: verification.id } });
    await recordTwoFAAttempt(ip, false);
    cookieStore.set("__Host-2fa", "", { maxAge: 0, path: "/" });
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(), userId: verification.identifier, roleLevel: 7,
        action: "TWO_FACTOR_CHALLENGE_LOCKED", targetType: "USER", targetId: verification.identifier,
        details: JSON.stringify({ reason: "max_attempts_exceeded", maxAttempts: MAX_CHALLENGE_ATTEMPTS, ipAddress: ip, timestamp: new Date().toISOString() }),
        ipAddress: ip, userAgent, createdAt: new Date(), updatedAt: new Date(),
      },
    });
    return NextResponse.json({ error: "Trop de tentatives. Reconnecte-toi." }, { status: 429 });
  }

  const userId = verification.identifier;
  const twoFactor = await prisma.twoFactor.findUnique({
    where: { userId }, include: { backupCodes: true },
  });
  if (!twoFactor?.secret) {
    await recordTwoFAAttempt(ip, false);
    return NextResponse.json({ error: "Configuration 2FA introuvable" }, { status: 500 });
  }

  const cleanCode = code.trim().toUpperCase();
  let verified = false;
  let usedBackupCode = false;

  verified = speakeasy.totp.verify({ secret: twoFactor.secret, encoding: "base32", token: cleanCode, window: 2 });

  if (!verified) {
    for (const backup of twoFactor.backupCodes) {
      if (backup.used) continue;
      if (await bcrypt.compare(cleanCode, backup.codeHash)) {
        verified = true; usedBackupCode = true;
        await prisma.twoFactorBackupCode.update({ where: { id: backup.id }, data: { used: true } });
        break;
      }
    }
  }

  if (!verified) {
    const updated = await prisma.verification.update({
      where: { id: verification.id }, data: { attemptCount: { increment: 1 } },
    });
    await recordTwoFAAttempt(ip, false);
    if (updated.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
      await prisma.verification.delete({ where: { id: verification.id } });
      cookieStore.set("__Host-2fa", "", { maxAge: 0, path: "/" });
      return NextResponse.json({ error: "Trop de tentatives. Reconnecte-toi." }, { status: 429 });
    }
    return NextResponse.json({
      error: `Code incorrect. Tentative ${updated.attemptCount}/${MAX_CHALLENGE_ATTEMPTS}.`,
      remainingAttempts: MAX_CHALLENGE_ATTEMPTS - updated.attemptCount,
    }, { status: 400 });
  }

  const now = new Date();
  const sessionToken = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: { id: crypto.randomUUID(), token: sessionToken, userId, expiresAt, ipAddress: ip, userAgent, createdAt: now, updatedAt: now },
    });
    await tx.verification.update({ where: { id: verification.id }, data: { consumedAt: now } });
    await tx.auditLog.create({
      data: {
        id: crypto.randomUUID(), userId, roleLevel: 7, action: "LOGIN_2FA_VERIFIED", targetType: "USER", targetId: userId,
        details: JSON.stringify({ method: usedBackupCode ? "backup_code" : "totp", usedBackupCode, timestamp: now.toISOString() }),
        ipAddress: ip, userAgent, createdAt: now, updatedAt: now,
      },
    });
  });

  await recordTwoFAAttempt(ip, true);
  cookieStore.set("__Host-2fa", "", { maxAge: 0, path: "/" });

  const sessionCookieName = `${process.env.BETTER_AUTH_COOKIE_PREFIX || "better-auth"}.session_token`;
  cookieStore.set(sessionCookieName, sessionToken, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: expiresAt, path: "/",
  });

  // Email notification
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (user?.email) {
    const emailPayload = buildSuperAdminLoginEmail({
      name: user.name || "Super Admin",
      date: now.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "long", timeZone: "Africa/Kinshasa" }),
      ip, userAgent,
    });
    sendEmail({ to: user.email, ...emailPayload }).catch((err) => console.error("[2FA] Email notification error:", err));
  }

  return NextResponse.json({ success: true });
}
