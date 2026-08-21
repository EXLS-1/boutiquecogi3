import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const security = await prisma.userSecurity.findUnique({
      where: { userId: session.user.id },
      include: { backupCodes: true },
    });

    if (!security?.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA not active' }, { status: 400 });
    }

    const remaining = security.backupCodes.filter((b) => !b.usedAt).length;

    return NextResponse.json({ total: 10, remaining, used: 10 - remaining });

  } catch (err) {
    console.error('[2FA_BACKUP_CODES]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
