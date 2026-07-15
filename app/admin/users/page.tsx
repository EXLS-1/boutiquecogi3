// app/admin/users/page.tsx

import { listUsersAction } from "@/server/actions/user-admin-actions";
import { listRolesAction } from "@/server/actions/role-actions";
import { listBlockedUsersAction } from "@/server/actions/user-admin-actions";
import { UsersTable } from "@/components/admin/users-table";
import { BlockedUsersTable } from "@/components/admin/New folder/blocked-users-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireMinLevel } from "@/lib/auth/rbac";
import { normalizeRole } from "@/lib/auth/rbac-shared";
import { redirect } from "next/navigation";
import { Users, Ban, Shield } from "lucide-react";

export default async function AdminUsersPage() {
    // Protection côté serveur
    try {
        await requireMinLevel(2, "/unauthorized");
    } catch {
        redirect("/unauthorized");
    }


    // Récupération parallèle des données
    const [usersResult, blockedResult] = await Promise.all([
        listUsersAction(),
        listRolesAction(),
        listBlockedUsersAction(),
    ]);

    // types déduits des composants (évite les erreurs TS 'unknown')
    const users = usersResult.success
        ? (usersResult.data as Array<{
            id: string;
            name: string | null;
            email: string;
            role: string;
            emailVerified: boolean | null;
            image: string | null;
            isBlocked: boolean;
            blockedUntil?: Date | null;
            createdAt: Date | string;
        }>)
            .map((u) => ({
                ...u,
                role: normalizeRole(u.role),
            }))
        : [];

//  const roles = rolesResult.success ? rolesResult.data : [];

    const blockedUsers = blockedResult.success
        ? (blockedResult.data as Array<{
            assignmentId: string;
            userId: string;
            email: string | null;
            name: string | null;
            role: string;
            roleLevel: number;
            blockedAt: Date | string | null;
            blockedUntil: Date | string | null;
            blockedReason: string | null;
            isPermanent: boolean;
        }>)
        : [];






    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-slate-700" />
                    Gestion des utilisateurs
                </h1>
                <p className="text-slate-500 mt-1">
                    Gérez les rôles, les blocages et les permissions des utilisateurs.
                </p>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-slate-100">
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="blocked" className="flex items-center gap-2">
                        <Ban className="w-4 h-4" />
                        Bloqués ({blockedUsers.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                    <UsersTable users={users} />
                </TabsContent>

                <TabsContent value="blocked" className="space-y-4">
                    <BlockedUsersTable initialBlockedUsers={blockedUsers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
