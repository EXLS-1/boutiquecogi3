import { UserModuleNav } from "@/components/admin/users/user-module-nav";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UsersTable } from "@/components/admin/users/users-table";

export default function AdminUsersPage() {
  return (
    <main className="container mx-auto max-w-6xl space-y-6 p-6">
      <UserModuleNav />
      <header><h1 className="text-3xl font-bold text-slate-950">Utilisateurs</h1><p className="text-slate-600">Rechercher, contrôler et administrer les comptes.</p></header>
      <UsersFilters />
      <UsersTable />
    </main>
  );
}
