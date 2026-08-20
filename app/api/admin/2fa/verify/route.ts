import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
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

    // 1. Alignement sur la table userSecurity et vérification du rôle
    const userSecurity = await prisma.userSecurity.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          include: { roleConfig: { select: { role: true, level: true } } },
        },
      },
    });

    if (!userSecurity || !userSecurity.twoFactorSecret) {
      return NextResponse.json(
        { error: "Configuration 2FA non initialisée" },
        { status: 400 }
      );
    }

    if (userSecurity.user?.roleConfig?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // 2. Vérification du code TOTP
    const verified = speakeasy.totp.verify({
      secret: userSecurity.twoFactorSecret,
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

    // 3. Génération des backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Array.from({ length: 8 }, () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".charAt(Math.floor(Math.random() * 32))
      ).join("")
    );

    // Pré-hachage hors transaction pour la performance
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((c) => bcrypt.hash(c, 10))
    );

    const now = new Date();
    const userLevel = userSecurity.user?.roleConfig?.level ?? 1;

    // 4. Transaction BDD rapide
    await prisma.$transaction(async (tx) => {
      await tx.userSecurity.update({
        where: { userId: session.user.id },
        data: {
          twoFactorEnabled: true,
          backupCodes: JSON.stringify(hashedBackupCodes),
          updatedAt: now,
        },
      });

      await tx.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId: session.user.id,
          roleLevel: userLevel,
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
