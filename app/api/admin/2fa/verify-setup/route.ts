import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP, generateBackupCodes } from '@/lib/2fa';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({ code: z.string().length(6).regex(/^\d+$/) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roleConfig: true },
    });
    if (!user?.roleConfig || user.roleConfig.level > 3) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = req.ip ?? 'unknown';
    const rl = rateLimit(`2fa-verify-setup:${user.id}:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { code } = schema.parse(await req.json());

    const security = await prisma.userSecurity.findUnique({
      where: { userId: user.id },
      include: { backupCodes: true },
    });

    if (!security?.twoFactorSecret) {
      return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });
    }
    if (security.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA already active' }, { status: 400 });
    }

    // Vérification TOTP
    if (!verifyTOTP(security.twoFactorSecret, code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Génération codes de secours
    const { plain, hashed } = generateBackupCodes();

    // Transaction atomique
    await prisma.$transaction([
      prisma.userSecurity.update({
        where: { userId: user.id },
        data: { twoFactorEnabled: true },
      }),
      // Suppression anciens codes
      prisma.twoFactorBackupCode.deleteMany({ where: { userSecurityId: security.id } }),
      // Création nouveaux
      prisma.twoFactorBackupCode.createMany({
        data: hashed.map((h) => ({ userSecurityId: security.id, codeHash: h })),
      }),
      // Invalidation sessions existantes (force re-auth avec 2FA)
      prisma.session.deleteMany({
        where: { userId: user.id, token: { not: session.sessionToken } },
      }),
    ]);

    await prisma.auditLog?.create({
      data: { userId: user.id, action: '2FA_ENABLED', ipAddress: ip },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      backupCodes: plain, // ← Affichage unique et final
      message: 'Conservez ces codes de secours. Ils ne seront plus jamais affichés.',
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    console.error('[2FA_VERIFY_SETUP]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
