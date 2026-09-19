// components/auth/dashboard-admin.tsx
// This component is responsible for rendering the admin dashboard.
// It checks if the user has the necessary permissions to access the dashboard
// and displays the appropriate content based on their role.
// Renders the link to the admin dashboard if the current user is an Admin or Super Admin.

import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/rbac/constants";
import { resolveAuthContext, isAdminOrSuperAdmin } from "@/lib/auth/server";

export default async function AdminDashboard() {
  const session = await getServerSession();
  const context = await resolveAuthContext();
  
  // Utilisation de la fonction pure
  const canSeeDashboard = hasPermission(session?.user?.role, "admin:dashboard");
  const canSeeDashboard = context ? isAdminOrSuperAdmin(context.user.role) : false;

  if (!canSeeDashboard) {
    return null;
  }

  return (
    <div>
      {canSeeDashboard && <Link href="/admin">Dashboard Admin</Link>}
      <Link href="/admin">Dashboard Admin</Link>
    </div>
  );
}