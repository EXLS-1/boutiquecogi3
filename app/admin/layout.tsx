import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verify2FAVerified } from '@/lib/2fa-cookie';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) redirect('/sign-in');

  // Vérification RBAC niveau 1–5
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roleConfig: true },
  });

  if (!user?.roleConfig || user.roleConfig.level > 3) redirect('/');

  // Vérification 2FA
  const security = await prisma.userSecurity.findUnique({
    where: { userId: user.id },
  });

  if (security?.twoFactorEnabled) {
    const sessionToken = session?.session?.token;
    if (!sessionToken) redirect('/admin/verify-2fa');

    const isVerified = await verify2FAVerified(sessionToken);
    if (!isVerified) redirect('/admin/verify-2fa');
  }

  return <>{children}</>;
}
