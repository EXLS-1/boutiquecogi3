// components/auth/dashboard-admin.tsx
// This component is responsible for rendering the admin dashboard.
// It checks if the user has the necessary permissions to access the dashboard
// and displays the appropriate content based on their role.
import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/rbac/constants";

export default async function AdminDashboard() {
  const session = await getServerSession();
  
  // Utilisation de la fonction pure
  const canSeeDashboard = hasPermission(session?.user?.role, "admin:dashboard");

  return (
    <div>
      {canSeeDashboard && <Link href="/admin">Dashboard Admin</Link>}
    </div>
  );
}