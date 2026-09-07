import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { BlockedUsersTable } from "@/components/admin/users/blocked-users-table";

export default function BlockedUsersPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header><h1 className="text-3xl font-bold text-slate-950">Utilisateurs bloqués</h1><p className="text-slate-600">Identifier les comptes bloqués et rétablir un accès valide.</p></header>
      <UsersFilters />
      <BlockedUsersTable />
    </main>
  );
}
