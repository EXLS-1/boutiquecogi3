// app/dashboard/admin/layout.tsx

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/server";
import { PERMISSIONS } from "@/lib/auth/rbac";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérification 1 : Session existe
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  // Vérification 2 : Permission RBAC côté serveur (atomic)
  await requirePermission(PERMISSIONS.ADMIN_DASHBOARD);

  // Vérification 3 : Rendu conditionnel avec données pré-chargées
  const role = (session.user as { role?: string }).role || "admin";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <AdminShell userRole={role}>
        {children}
      </AdminShell>
    </div>
  );
}

// Client component pour l'UI seulement
"use client";
function AdminShell({ userRole, children }: { userRole: string; children: React.ReactNode }) {
  return <>{children}</>; // UI interactive si besoin
}