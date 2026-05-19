// components/auth/admin.tsx
import Link from "next/link";
import { getServerSession } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/rbac";

export default async function Navbar() {
  const session = await getServerSession();
  
  // Utilisation de la fonction pure
  const canSeeDashboard = hasPermission(session?.user?.role, "admin:dashboard");

  return (
    <div>
      {/* ... */}
      {canSeeDashboard && <Link href="/admin">Dashboard Admin</Link>}
    </div>
  );
}