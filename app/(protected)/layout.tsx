import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/rbac"; // Source de vérité unifiée
import { getClientPermissions, getClientRestrictions } from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";
import { PERMISSIONS as SHARED_PERMISSIONS, type Permission as SharedPermission } from "@/lib/auth/rbac-shared";

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
  const validPermissions = new Set<string>(Object.values(SHARED_PERMISSIONS));
  const initialPermissions = permissions.flatMap((permission) => {
    const code = String(permission) === "auditlog:view-logs"
      ? SHARED_PERMISSIONS["audit:view-logs"]
      : String(permission);
    return validPermissions.has(code) ? [code as SharedPermission] : [];
  });

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={level}
      initialPermissions={initialPermissions}
      initialRestrictions={restrictions ?? []}
      requiresAuditApproval={level <= 2} // Évaluation explicite typée sans variable orpheline
    >
      <div className="flex min-h-screen flex-col bg-cyan-50">
        {children}
      </div>
    </SwitchProvider>
  );
}
