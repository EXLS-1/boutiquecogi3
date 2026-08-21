import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/2fa';
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
    const rl = rateLimit(`2fa-disable:${user.id}:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { code } = schema.parse(await req.json());

    const security = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
    if (!security?.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not active' }, { status: 400 });
    }

    // Exige un code TOTP valide (pas de backup code pour la désactivation)
    if (!verifyTOTP(security.twoFactorSecret!, code)) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.userSecurity.update({
        where: { userId: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
      prisma.twoFactorBackupCode.deleteMany({ where: { userSecurityId: security.id } }),
      prisma.session.deleteMany({ where: { userId: user.id, token: { not: session.sessionToken } } }),
    ]);

    await prisma.auditLog?.create({
      data: { userId: user.id, action: '2FA_DISABLED', ipAddress: ip },
    }).catch(() => {});

    return NextResponse.json({ success: true });

  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[2FA_DISABLE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
