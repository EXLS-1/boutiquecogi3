import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTOTPSecret } from '@/lib/2fa';
import { encrypt } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import { toDataURL } from 'qrcode';
import { z } from 'zod';

export async function GET(req: NextRequest) {
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

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
    const rl = rateLimit(`2fa-setup:${user.id}:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) }, { status: 429 });
    }

    const { base32, uri } = generateTOTPSecret(user.id);
    const encrypted = encrypt(base32);
    const qrDataUrl = await toDataURL(uri, { type: 'image/png', margin: 2, width: 240, color: { dark: '#000', light: '#fff' } });

    await prisma.userSecurity.upsert({
      where: { userId: user.id },
      update: { twoFactorSecret: encrypted, twoFactorEnabled: false },
      create: { userId: user.id, twoFactorSecret: encrypted, twoFactorEnabled: false },
    });

    await prisma.auditLog?.create({
      data: { userId: user.id, action: '2FA_SETUP_INITIATED', ipAddress: ip, userAgent: req.headers.get('user-agent') ?? undefined },
    }).catch(() => {});

    return NextResponse.json({ success: true, uri, qrDataUrl });

  } catch (err) {
    console.error('[2FA_SETUP]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
