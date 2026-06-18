import { redirect } from "next/navigation";
import { 
  getCurrentUserWithRole, 
  getClientPermissions, 
  getClientRestrictions 
} from "@/lib/auth/rbac";
import { RBACProvider } from "@/components/providers/rbac-provider";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Récupération centralisée et normalisée de la session et du rôle
  const authContext = await getCurrentUserWithRole();

  // Guard de premier niveau : Si non authentifié, redirection immédiate
  if (!authContext || !authContext.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  const { user, role, level } = authContext;

  // 2. Résolution parallèle des permissions et restrictions pour le Client Downstream
  // Optimisation de la performance (évite le waterfall séquentiel)
  const [permissions, restrictions] = await Promise.all([
    getClientPermissions(role),
    getClientRestrictions(role),
  ]);

  return (
    <RBACProvider 
      user={user} 
      role={role} 
      level={level} 
      permissions={permissions} 
      restrictions={restrictions}
    >
      <div className="flex min-h-screen flex-col bg-slate-50">
        {/* Vos composants de structure globale (Sidebar, Navbar) consommeront ce contexte */}
        {children}
      </div>
    </RBACProvider>
  );
}