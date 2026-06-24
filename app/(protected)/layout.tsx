import { redirect } from "next/navigation";
import { getCurrentUserWithRole, getClientPermissions, getClientRestrictions } from "@/lib/auth/rbac";
import { SwitchProvider } from "@/components/providers/switch-provider";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const authContext = await getCurrentUserWithRole();

  if (!authContext?.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  const { role, level } = authContext;

  // Chargement initial des droits du vrai utilisateur connecté
  const [permissions, restrictions] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
  ]);

  return (
    <SwitchProvider
      initialRole={role}
      initialLevel={level}
      initialPermissions={permissions}
      initialRestrictions={restrictions}
      requiresAuditApproval={true}
    >
      <div className="flex min-h-screen flex-col bg-slate-50">
        {children}
      </div>
    </SwitchProvider>
  );
}