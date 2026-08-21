import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const session = await auth.api.getSession({ headers: h });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const security = await prisma.userSecurity.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      twoFactorEnabled: security?.twoFactorEnabled ?? false,
      backupCodesRemaining: 0,
    });
  } catch (err) {
    console.error('[2FA_CHECK_STATUS]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
