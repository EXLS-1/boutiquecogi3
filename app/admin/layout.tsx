import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/rbac"; // Source de vérité unifiée
import { isPinEnabled, isAdminPinVerified } from "@/lib/pin/admin-pin";
import { AdminPinGate } from "@/components/admin/admin-pin-gate";
import { AdminPinSession } from "@/components/admin/admin-pin-session";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // 1. Authentification & RBAC unifiés
  const authContext = await getAuthContext();

  if (!authContext?.isAuthenticated) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  // 2. Vérification 2FA
  if (!authContext.is2FAVerified) {
    redirect("/admin/verify-2fa");
  }

  // 3. Contrôle d'accès strict au périmètre Admin (RBAC Level Check)
  // Niveau 1 et 2 uniquement (ex: 1 = SuperAdmin, 2 = Admin)
  if (authContext.level > 2) {
    redirect("/unauthorized");
  }

  // 4. Verrouillage additionnel par PIN Administrateur (Defense in Depth)
  const pinEnabled = await isPinEnabled();
  if (pinEnabled) {
    const pinVerified = await isAdminPinVerified(authContext.user.id);

    if (!pinVerified) {
      return <AdminPinGate />;
    }

    return <AdminPinSession>{children}</AdminPinSession>;
  }

  return <>{children}</>;
}
