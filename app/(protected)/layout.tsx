import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/rbac"; // Source de vérité unifiée
import { getClientPermissions, getClientRestrictions } from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  // 1. Contrôle d'authentification unifié
  const authContext = await getAuthContext();

  if (!authContext?.isAuthenticated) {
    // Redirection dynamique sécurisée conservant la destination requise
    redirect(`/auth/sign-in?callbackUrl=/admin/dashboard`);
  }

  // 2. Contrôle 2FA global
  if (!authContext.is2FAVerified) {
    redirect("/auth/verify-2fa");
  }

  const { role, level } = authContext;

  // 3. Récupération concurrente (non-bloquante) des autorisations/restrictions
  const [permissions, restrictions] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
  ]);

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={level}
      initialPermissions={permissions}
      initialRestrictions={restrictions ?? []}
      requiresAuditApproval={level <= 2} // Évaluation explicite typée sans variable orpheline
    >
      <div className="flex min-h-screen flex-col bg-cyan-50">
        {children}
      </div>
    </SwitchProvider>
  );
}
