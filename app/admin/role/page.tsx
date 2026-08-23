// app/admin/role/page.tsx

import Link from 'next/link';
import { listRolesAction } from "@/server/actions/role-actions";
import { RolesTable } from "@/components/admin/role-table";
import { requireMinLevel } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";
import { Shield } from "lucide-react";

export default async function AdminRolesPage() {
    try {
        await requireMinLevel(2, "/unauthorized");
    } catch {
        redirect("/unauthorized");
    }

    const rolesResult = await listRolesAction();
    const roles = rolesResult.success && Array.isArray(rolesResult.data)
        ? rolesResult.data
        : [];

    return (
        <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
              {/* En-tête */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
       
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-slate-700" />
                    Gestion des rôles
                </h1>
                <p className="text-slate-500 mt-1">
                    Créez, modifiez et supprimez les rôles de votre hiérarchie.
                </p>
            </div>
            <div className="gap-8">
                <Link
                    href="/admin/users"
                    className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                    Utilisateurs
                </Link>
                <Link
                    href="/admin/account"
                    className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                    Comptes
                </Link>
                <Link
                    href="/admin"
                    className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
                >
                    Portail Admin
                </Link>
            </div>
        </header>
        
         <RolesTable initialRoles={roles} />
        
        </div>
    );
}
