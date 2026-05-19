import { prisma } from "@/lib/prisma/client";
import { UsersTable } from "@/app/actions/admin/users-tables";
import { Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  // Récupération performante des utilisateurs
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-cyan-700" />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestion des Utilisateurs</h1>
      </div>

      <UsersTable initialUsers={users} />
    </div>
  );
}
