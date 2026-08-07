//app/api/admin/2fa/verify/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Code TOTP à 6 chiffres requis" },
        { status: 400 }
      );
    }

    const twoFactor = await prisma.twoFactor.findUnique({
      where: { userId: session.user.id },
      include: { user: { include: { roleConfig: { select: { role: true } } } } },
    });

    if (!twoFactor || !twoFactor.secret) {
      return NextResponse.json(
        { error: "Configuration 2FA non initialisée" },
        { status: 400 }
      );
    }

    if (twoFactor.user?.roleConfig?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return NextResponse.json(
        { error: "Code incorrect ou expiré" },
        { status: 400 }
      );
    }

    const now = new Date();
    const backupCodes = Array.from({ length: 10 }, () =>
      Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".charAt(Math.floor(Math.random() * 32))
      ).join("")
    );

    await prisma.$transaction(async (tx) => {
      await tx.twoFactor.update({
        where: { userId: session.user.id },
        data: { enabled: true, updatedAt: now },
      });

      await tx.userSecurity.upsert({
        where: { userId: session.user.id },
        update: { twoFactorEnabled: true },
        create: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          twoFactorEnabled: true,
          isBlocked: false,
        },
      });

      for (const backupCode of backupCodes) {
        await tx.twoFactorBackupCode.create({
          data: {
            id: crypto.randomUUID(),
            twoFactorId: twoFactor.id,
            codeHash: await bcrypt.hash(backupCode, 10),
            used: false,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          roleLevel: 7,
          action: "TWO_FACTOR_ENABLED",
          targetType: "USER",
          targetId: session.user.id,
          details: JSON.stringify({ method: "totp", backupCodesCount: 10 }),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          userAgent: request.headers.get("user-agent") || "unknown",
          createdAt: now,
          updatedAt: now,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Authentification à deux facteurs activée",
      backupCodes,
    });
  } catch (error) {
    console.error("[2FA VERIFY ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de l'activation du 2FA" },
      { status: 500 }
    );
  }
}
