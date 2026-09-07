"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { USER_ROLES, USER_STATUSES } from "@/lib/admin/users/users.constants";
import { useAdminUsersStore } from "@/store/admin/users/admin-users-store";

export function UsersFilters() {
  const { search, status, role, setFilters } = useAdminUsersStore();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Input value={search} onChange={(e) => setFilters({ search: e.target.value })} placeholder="Rechercher nom, email ou ID…" />
      <Select value={status ?? "ALL"} onValueChange={(value) => setFilters({ status: value === "ALL" ? undefined : value as typeof status })}>
        <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
        <SelectContent><SelectItem value="ALL">Tous les statuts</SelectItem>{USER_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={role ?? "ALL"} onValueChange={(value) => setFilters({ role: value === "ALL" ? undefined : value as typeof role })}>
        <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
        <SelectContent><SelectItem value="ALL">Tous les rôles</SelectItem>{USER_ROLES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
