import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTOTP, verifyBackupCode } from '@/lib/2fa';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(6),
  tempToken: z.string().optional(), // Si vous utilisez un flux intermédiaire
});

export async function POST(req: NextRequest) {
  try {
    // Dans un flux Better-Auth custom, vous recevez ici l'identifiant utilisateur
    // après un login "partiel". Adaptez selon votre flux.
    const body = schema.parse(await req.json());
    
    // Exemple : récupération via un token temporaire signé ou session partielle
    // Ici, simplifié : l'utilisateur est déjà en session mais avec un flag 2FA pending
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ip = req.ip ?? 'unknown';
    const rl = rateLimit(`2fa-verify:${session.user.id}:${ip}`, 5, 5 * 60 * 1000);
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const security = await prisma.userSecurity.findUnique({
      where: { userId: session.user.id },
      include: { backupCodes: true },
    });

    if (!security?.twoFactorEnabled || !security.twoFactorSecret) {
      return NextResponse.json({ error: '2FA not configured' }, { status: 400 });
    }

    let valid = false;
    let isBackup = false;

    // Tentative TOTP
    if (body.code.length === 6 && /^\d+$/.test(body.code)) {
      valid = verifyTOTP(security.twoFactorSecret, body.code);
    }

    // Tentative Backup Code
    if (!valid && body.code.match(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/)) {
      const unused = security.backupCodes.filter((b) => !b.usedAt);
      const check = verifyBackupCode(body.code, unused.map((b) => b.codeHash));
      if (check.valid) {
        valid = true;
        isBackup = true;
        // Marquer comme utilisé
        await prisma.twoFactorBackupCode.update({
          where: { id: unused[check.index].id },
          data: { usedAt: new Date() },
        });
      }
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Ici : marquer la session comme "2FA vérifiée"
    // Selon Better-Auth, vous pouvez utiliser un cookie custom ou étendre le modèle Session
    // Exemple minimal : cookie signé
    const response = NextResponse.json({ success: true, isBackup });
    
    await prisma.auditLog?.create({
      data: { userId: session.user.id, action: isBackup ? '2FA_BACKUP_USED' : '2FA_VERIFIED', ipAddress: ip },
    }).catch(() => {});

    return response;

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    console.error('[2FA_VERIFY]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
