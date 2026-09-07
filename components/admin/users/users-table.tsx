"use client";

import { useTransition } from "react";
import { MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminUsers } from "@/hooks/admin/users/use-admin-users";
import { blockUserAction } from "@/server/actions/admin/users/block-user";
import { unblockUserAction } from "@/server/actions/admin/users/unblock-user";
import { deleteUserAction } from "@/server/actions/admin/users/delete-user";

export function UsersTable() {
  const { items, pagination, isLoading, reload } = useAdminUsers();
  const [pending, startTransition] = useTransition();
  const mutate = (fn: () => Promise<unknown>) => startTransition(() => void fn().then(() => reload(pagination.page)));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left"><th className="p-3">Utilisateur</th><th className="p-3">Rôle</th><th className="p-3">Statut</th><th className="p-3">2FA</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id} className="border-b last:border-0">
              <td className="p-3"><div className="font-medium">{user.name || "Sans nom"}</div><div className="text-muted-foreground">{user.email}</div></td>
              <td className="p-3"><Badge variant="outline">{user.role}</Badge></td>
              <td className="p-3"><Badge variant={user.blocked ? "destructive" : "secondary"}>{user.blocked ? "BLOQUÉ" : user.status}</Badge></td>
              <td className="p-3">{user.twoFactorEnabled ? <ShieldCheck className="size-4" /> : "—"}</td>
              <td className="p-3 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={pending || isLoading}><MoreHorizontal /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.blocked ? <DropdownMenuItem onClick={() => mutate(() => unblockUserAction({ userId: user.id, expectedVersion: user.auditVersion }))}><ShieldCheck /> Débloquer</DropdownMenuItem> : <DropdownMenuItem onClick={() => mutate(() => blockUserAction({ userId: user.id, expectedVersion: user.auditVersion, reason: "Blocage administratif" }))}><ShieldOff /> Bloquer</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive" onClick={() => mutate(() => deleteUserAction({ userId: user.id, expectedVersion: user.auditVersion, reason: "Suppression administrative" }))}><Trash2 /> Désactiver</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-3"><span>{pagination.total} utilisateur(s)</span><div className="flex gap-2"><Button disabled={!pagination.hasPreviousPage} onClick={() => void reload(pagination.page - 1)}>Précédent</Button><Button disabled={!pagination.hasNextPage} onClick={() => void reload(pagination.page + 1)}>Suivant</Button></div></div>
    </div>
  );
}
