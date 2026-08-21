import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTOTPSecret } from '@/lib/2fa';
import { encrypt } from '@/lib/crypto';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    // ─── 1. Authentification ───
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // ─── 2. RBAC (niveaux 1–3 : Admin/Super-Admin) ───
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { roleConfig: true },
    });
    if (!user?.roleConfig || user.roleConfig.level > 3) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ─── 3. Rate Limit ───
    const ip = req.ip ?? 'unknown';
    const rl = rateLimit(`2fa-setup:${user.id}:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests', retryAfter: Math.ceil((rl.resetAt - Date.now())/1000) }, { status: 429 });
    }

    // ─── 4. Génération TOTP ───
    const { base32, uri, qrUri } = generateTOTPSecret(user.id);
    const encrypted = encrypt(base32);

    // ─── 5. Stockage temporaire (non activé) ───
    await prisma.userSecurity.upsert({
      where: { userId: user.id },
      update: {
        twoFactorSecret: encrypted,
        twoFactorEnabled: false,
      },
      create: {
        userId: user.id,
        twoFactorSecret: encrypted,
        twoFactorEnabled: false,
      },
    });

    // ─── 6. Audit log (best-effort) ───
    await prisma.auditLog?.create({
      data: { userId: user.id, action: '2FA_SETUP_INITIATED', ipAddress: ip, userAgent: req.headers.get('user-agent') ?? undefined },
    }).catch(() => {});

    return NextResponse.json({ success: true, uri, qrUri });

  } catch (err) {
    console.error('[2FA_SETUP]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
