// app/admin/roles/page.tsx

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
    const roles = rolesResult.success ? (rolesResult.data as any[]) : [];

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-slate-700" />
                    Gestion des rôles
                </h1>
                <p className="text-slate-500 mt-1">
                    Créez, modifiez et supprimez les rôles de votre hiérarchie.
                </p>
            </div>

            <RolesTable initialRoles={roles} />
        </div>
    );
}
