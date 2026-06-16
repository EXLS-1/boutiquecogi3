// /app/(dashboard)/admin/layout.tsx
// ============================================
// Layout protégé — Server Component
// ============================================

import { getCurrentUserWithRole, requireMinLevel, getRoleLevel, ROLES } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { RightSidebar } from "@/components/toggle/right-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserWithRole();
  
  // Redirect if user is not authenticated
  if (!user) {
    redirect("/auth/sign-in");
  }
  
  // Vérifie si le niveau de l'utilisateur actuel satisfait l'exigence minimale pour ADMIN.
  // Passe le rôle de l'utilisateur déjà obtenu pour éviter de refetch la session dans requireMinLevel.
  await requireMinLevel(getRoleLevel(ROLES.ADMIN), "/unauthorized", user.role);
  return (
    <div className="admin-layout">
      {/* RightSidebar component, assuming it's a client component or handles its own state */}
      <RightSidebar />
      {/* Main content area for the dashboard */}
      <main>{children}</main>
    </div>
  );
}