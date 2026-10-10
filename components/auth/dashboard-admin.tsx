// components/auth/dashboard-admin.tsx
// This component is responsible for rendering the admin dashboard.
// It checks if the user has the necessary permissions to access the dashboard
// and displays the appropriate content based on their role.
// Renders the link to the admin dashboard if the current user is an Admin or Super Admin.

import Link from "next/link";
import {
  resolveAuthContext,
  isAdminOrSuperAdmin,
  normalizeRole,
} from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac-shared";

export default async function AdminDashboard() {
  const context = await resolveAuthContext();

  // Unauthenticated → nothing to render (guarded route handles redirects elsewhere).
  if (!context) {
    return null;
  }

  // Normalise le rôle (robuste aux valeurs null/unknown venues de la session).
  const role = normalizeRole(context.user?.role);

  // Logique robuste : accès si ADMIN/SUPER_ADMIN OU permission dashboard explicite.
  // `context.permissions` est un Set<PermissionCode> déjà résolu côté serveur.
  const hasDashboardPermission = context.permissions.has(
    PERMISSIONS["analytics:dashboard:view"],
  );
  const canSeeDashboard =
    isAdminOrSuperAdmin(role) || hasDashboardPermission;

  if (!canSeeDashboard) {
    return null;
  }

  return (
    <div>
      <Link href="/admin">Dashboard Admin</Link>
    </div>
  );
}
