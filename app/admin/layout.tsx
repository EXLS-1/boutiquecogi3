// app/admin/layout.tsx
import { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerRBACSession } from "@/lib/auth/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verify2FAVerified } from "@/lib/2fa-cookie";
import { isPinEnabled, isAdminPinVerified } from "@/lib/pin/admin-pin";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { AdminPinSession } from "@/components/admin/admin-pin-session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // 1. Source de vérité unique pour la session et le RBAC
  const session = await getServerRBACSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  // 2. Contrôle d'accès unifié par niveau (Fail-closed)
  if (session.level > 2) {
    redirect("/unauthorized");
  }

  // 3. Vérification 2FA (nécessite le token brut de la session d'authentification)
  const h = await headers();
  const rawAuthSession = await auth.api.getSession({ headers: h });

  const security = await prisma.userSecurity.findUnique({
    where: { userId: session.user.id },
    select: { twoFactorEnabled: true },
  });

  if (security?.twoFactorEnabled) {
    const sessionToken = rawAuthSession?.session?.token;
    if (!sessionToken) redirect("/admin/verify-2fa");

    const isVerified = await verify2FAVerified(sessionToken);
    if (!isVerified) redirect("/admin/verify-2fa");
  }

  // 4. Code PIN administrateur (Isolation stricte et verrouillage temporel)
  const pinEnabled = await isPinEnabled();
  if (pinEnabled) {
    const pinVerified = await isAdminPinVerified(session.user.id);

    if (!pinVerified) {
      return <AdminPinGate />;
    }

    return <AdminPinSession>{children}</AdminPinSession>;
  }

  return <>{children}</>;
}
