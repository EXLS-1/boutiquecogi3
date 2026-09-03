import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP, verifyBackupCode } from '@/lib/2fa';
import { sign2FAVerified } from '@/lib/2fa-cookie';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({ code: z.string().min(6) });

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`2fa-verify:${session.user.id}:${ip}`, 5, 5 * 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const { code } = schema.parse(await req.json());

    const security = await prisma.userSecurity.findUnique({
      where: { userId: session.user.id },
      include: { backupCodes: true },
    });

    if (!security?.twoFactorEnabled || !security.twoFactorSecret) {
      return NextResponse.json({ error: '2FA not configured' }, { status: 400 });
    }

    let valid = false;
    let isBackup = false;

    if (code.length === 6 && /^\d+$/.test(code)) {
      valid = verifyTOTP(security.twoFactorSecret, code);
    }

    if (!valid && /^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/.test(code)) {
      const unused = security.backupCodes.filter((b) => !b.usedAt);
      const check = verifyBackupCode(code, unused.map((b) => b.codeHash));
      if (check.valid) {
        valid = true;
        isBackup = true;
        await prisma.twoFactorBackupCode.update({
          where: { id: unused[check.index].id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!valid) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

    await sign2FAVerified(session.user.id, session.session.token);

    await prisma.auditLog?.create({
      data: { userId: session.user.id, action: isBackup ? '2FA_BACKUP_USED' : '2FA_VERIFIED', ipAddress: ip },
    }).catch(() => {});

    return NextResponse.json({ success: true, isBackup });

  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    console.error('[2FA_VERIFY]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
