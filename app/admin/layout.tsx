// app/admin/layout.tsx
import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verify2FAVerified } from '@/lib/2fa-cookie';
import { isPinEnabled, isAdminPinVerified } from '@/lib/pin/admin-pin';
import { AdminPinGate } from '@/components/admin/admin-pin-gate';
import { AdminPinSession } from '@/components/admin/admin-pin-session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const session = await auth.api.getSession({ headers: h });

  if (!session?.user) redirect('/sign-in');

  // 1. Vérification RBAC niveau 1–3
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { roleAssignment: { include: { roleConfig: true } } },
  });

  if (!user?.roleAssignment || user.roleAssignment.roleConfig.level > 3) redirect('/');

  // 2. Vérification 2FA
  const security = await prisma.userSecurity.findUnique({
    where: { userId: user.id },
  });

  if (security?.twoFactorEnabled) {
    const sessionToken = session?.session?.token;
    if (!sessionToken) redirect('/admin/verify-2fa');

    const isVerified = await verify2FAVerified(sessionToken);
    if (!isVerified) redirect('/admin/verify-2fa');
  }

  // 3. Code PIN admin — activé UNE FOIS les vérifications RBAC et 2FA exécutées.
  //    Protège TOUTE la section /admin/* (et plus uniquement la page /admin) :
  //    tant que le PIN n'est pas validé (cookie httpOnly signé, lié à
  //    l'utilisateur, expirant après 5 min), le gate s'affiche À LA PLACE du
  //    contenu — aucune donnée protégée n'est envoyée au client.
  const pinEnabled = await isPinEnabled();
  if (pinEnabled) {
    const pinVerified = await isAdminPinVerified(user.id);

    if (!pinVerified) {
      return <AdminPinGate />;
    }

    // Garde d'inactivité : 5 min sans événement → révocation de la session PIN
    // → re-saisie du code (fail-closed, vérifiée côté serveur au refresh).
    return <AdminPinSession>{children}</AdminPinSession>;
  }

  return <>{children}</>;
}
