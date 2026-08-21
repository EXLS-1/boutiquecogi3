import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/2fa';
import { clear2FAVerified } from '@/lib/2fa-cookie';
import { rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(1, 'Mot de passe requis'),
  code: z.string().min(6, 'Code 2FA requis'),
});

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roleConfig: true },
    });
    if (!user?.roleConfig || user.roleConfig.level > 3) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
    const rl = rateLimit(`2fa-disable:${user.id}:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many attempts. Retry in 1 hour.' }, { status: 429 });
    }

    const body = schema.parse(await req.json());

    // ─── 1. Vérification du mot de passe (Better-Auth credential) ───
    const account = await prisma.account.findFirst({
      where: { userId: user.id, providerId: 'credential' },
    });
    if (!account?.password) {
      return NextResponse.json({ error: 'No local password found' }, { status: 400 });
    }

    const validPassword = await bcrypt.compare(body.password, account.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }

    // ─── 2. Vérification TOTP ───
    const security = await prisma.userSecurity.findUnique({ where: { userId: user.id } });
    if (!security?.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not active' }, { status: 400 });
    }

    const isValidTOTP = verifyTOTP(security.twoFactorSecret!, body.code);
    if (!isValidTOTP) {
      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 400 });
    }

    // ─── 3. Désactivation atomique ───
    await prisma.$transaction([
      prisma.userSecurity.update({
        where: { userId: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      }),
      prisma.twoFactorBackupCode.deleteMany({ where: { userSecurityId: security.id } }),
      // Invalide TOUTES les sessions sauf la courante
      prisma.session.deleteMany({ where: { userId: user.id, token: { not: session.sessionToken } } }),
    ]);

    // Supprime le cookie de vérification 2FA
    await clear2FAVerified();

    await prisma.auditLog?.create({
      data: {
        userId: user.id,
        action: '2FA_DISABLED',
        ipAddress: ip,
        metadata: { reason: 'User initiated via password confirmation' },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: '2FA disabled successfully' });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten().fieldErrors }, { status: 400 });
    }
    console.error('[2FA_DISABLE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
