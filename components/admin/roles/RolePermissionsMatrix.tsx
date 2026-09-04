// components/admin/roles/RolePermissionsMatrix.tsx — Module 4 : matrice de permissions.
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

import { ROLES_CONSTANTS } from '@/constants/roles';
import { getRolePermissionsAction, updateRolePermissionsAction } from '@/lib/roles/role-actions';
import { useRoleStore } from '@/store/roles/use-role-store';
import type { RolePermissionRef } from '@/types/role';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const M = ROLES_CONSTANTS.MESSAGES;

export function RolePermissionsMatrix() {
  const router = useRouter();
  const { isPermissionsOpen, selectedRole, closePermissions } = useRoleStore();
  const [catalog, setCatalog] = React.useState<RolePermissionRef[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // Charge le catalogue des permissions disponibles + celles déjà attribuées au rôle.
  React.useEffect(() => {
    if (!isPermissionsOpen || !selectedRole) return;

    let cancelled = false;
    (async () => {
      const res = await getRolePermissionsAction();
      if (!cancelled) {
        setCatalog(res.success ? res.data : []);
        setSelected(selectedRole.permissions.map((p) => p.code));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPermissionsOpen, selectedRole]);

  const togglePermission = (perm: string) => {
    setSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    try {
      const res = await updateRolePermissionsAction(selectedRole.id, selected);
      if (!res.success) throw new Error(res.error || M.ERROR_GENERIC);
      toast.success(M.PERMISSIONS_SUCCESS);
      closePermissions();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : M.ERROR_GENERIC);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isPermissionsOpen || !selectedRole) return null;

  return (
    <Dialog open={isPermissionsOpen} onOpenChange={(open) => !open && closePermissions()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck /> Permissions pour : {selectedRole.name}
          </DialogTitle>
          <DialogDescription>
            {catalog.length} permission(s) disponibles. Cochez celles à attribuer au rôle.
          </DialogDescription>
        </DialogHeader>
        {catalog.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <p className="text-sm">Chargement des permissions…</p>
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {catalog.map((perm) => (
              <div
                key={perm.code}
                className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50"
              >
                <Checkbox
                  id={`perm-${perm.code}`}
                  checked={selected.includes(perm.code)}
                  onCheckedChange={() => togglePermission(perm.code)}
                />
                <div className="flex flex-col">
                  <label
                    htmlFor={`perm-${perm.code}`}
                    className="cursor-pointer text-sm font-medium break-all"
                  >
                    {perm.name || perm.code}
                  </label>
                  <code className="text-xs text-muted-foreground break-all">{perm.code}</code>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={closePermissions}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving || catalog.length === 0}>
            {isSaving ? 'Application…' : 'Appliquer les Permissions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}