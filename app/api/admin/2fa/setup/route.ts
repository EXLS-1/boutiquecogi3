// app/api/admin/2fa/setup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roleConfig: { select: { role: true } } },
    });

    if (user?.roleConfig?.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const secret = speakeasy.generateSecret({
      name: `Boutiquecogi3 (${user.email})`,
      length: 32,
    });

    const now = new Date();

    await prisma.twoFactor.upsert({
      where: { userId: user.id },
      update: {
        secret: secret.base32,
        enabled: false,
        updatedAt: now,
      },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        secret: secret.base32,
        enabled: false,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (!secret.otpauth_url) {
      return NextResponse.json(
        { error: "Impossible de générer l'URL d'authentification 2FA" },
        { status: 500 }
      );
    }

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    console.error("[2FA SETUP ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du QR Code" },
      { status: 500 }
    );
  }
}
