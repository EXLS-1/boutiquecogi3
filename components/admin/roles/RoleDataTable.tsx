// components/admin/roles/RoleDataTable.tsx — Module 2 : liste, recherche, actions.
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CheckCircle2, Pencil, Plus, Search, ShieldCheck, Trash2, XCircle } from 'lucide-react';

import { ROLES_CONSTANTS } from '@/constants/roles';
import { useRoleStore } from '@/store/roles/use-role-store';
import { deleteRoleAction } from '@/lib/roles/role-actions';
import type { Role } from '@/types/role';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const M = ROLES_CONSTANTS.MESSAGES;

interface RoleDataTableProps {
  roles: Role[];
}

export function RoleDataTable({ roles }: RoleDataTableProps) {
  const router = useRouter();
  const { openForm, openPermissions } = useRoleStore();
  const [search, setSearch] = React.useState('');
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      [r.name, r.description ?? '', r.permissions.map((p) => p.code).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [roles, search]);

  const handleDelete = React.useCallback(async (role: Role) => {
    if (typeof window !== 'undefined' && !window.confirm(`${M.DELETE_CONFIRM} ${role.name}`)) return;
    setPendingId(role.id);
    try {
      const res = await deleteRoleAction(role.id);
      if (res.success) {
        toast.success(M.DELETE_SUCCESS);
        router.refresh();
      } else {
        toast.error(res.error || M.ERROR_GENERIC);
      }
    } catch {
      toast.error(M.ERROR_GENERIC);
    } finally {
      setPendingId(null);
    }
  }, [router]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Liste des Rôles</h2>
          <Badge variant="secondary">{filtered.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher un rôle"
              className="h-9 w-full pl-8 sm:w-64"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => openForm()}>
            <Plus /> Créer un Rôle
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Utilisateurs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Perm.</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  Aucun rôle trouvé.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell><Badge variant="secondary">{role.level}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {role.description || '—'}
                  </TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell>
                    {role.isActive ? (
                      <Badge className="gap-1"><CheckCircle2 /> Actif</Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1"><XCircle /> Inactif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1"><ShieldCheck /> {role.permissions.length}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openForm(role)}>
                        <Pencil /> Éditer
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openPermissions(role)}>
                        <ShieldCheck /> Permissions
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={pendingId === role.id}
                        onClick={() => handleDelete(role)}
                      >
                        {pendingId === role.id ? '…' : <Trash2 />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}