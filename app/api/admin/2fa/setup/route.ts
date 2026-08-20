import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ─── 1. Authentification ───
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email || "admin@boutiquecogi3.local";

    // ─── 2. Vérifier si 2FA déjà actif ───
    const existing = await prisma.userSecurity.findFirst({
      where: { userId },
    });

    if (existing?.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Le 2FA est déjà activé pour ce compte" },
        { status: 400 }
      );
    }

    // ─── 3. Génération du secret TOTP (base32) ───
    const secret = speakeasy.generateSecret({
      name: `Boutiquecogi3:${userEmail}`,
      issuer: "Boutiquecogi3",
      length: 32,
    });

    // ─── 4. Construction URI otpauth strictement conforme RFC ───
    // Format : otpauth://totp/{label}?secret={secret}&issuer={issuer}
    // Le label DOIT être encodé. Le issuer DOIT matcher exactement.
    const label = `Boutiquecogi3:${userEmail}`;
    const encodedLabel = encodeURIComponent(label);
    const encodedIssuer = encodeURIComponent("Boutiquecogi3");

    const otpauthUri = `otpauth://totp/${encodedLabel}?secret=${secret.base32}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

    // ─── 5. Génération du QR code en Data URL (PNG base64) ───
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
      type: "image/png",
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    // ─── 6. Stockage temporaire du secret (non activé encore) ───
    // On stocke le secret en clair ici pour le vérifier ensuite.
    // En production : chiffre ce secret avec AES-256-GCM avant stockage.
    await prisma.userSecurity.upsert({
      where: { userId },
      update: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
        backupCodes: null,
      },
      create: {
        userId,
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
        backupCodes: null,
      },
    });

    // ─── 7. Réponse ───
    return NextResponse.json({
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    console.error("[2FA_SETUP_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du 2FA" },
      { status: 500 }
    );
  }
}
