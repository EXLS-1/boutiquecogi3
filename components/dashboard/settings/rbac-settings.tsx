// components/dashboard/settings/rbac-settings.tsx
'use client';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { syncRolePermissionsAction } from '@/lib/actions/rbac';
import { rbacSchema, type RbacValues, PERMISSIONS, ROLES } from '@/lib/rbac';

interface Props {
  roleId: string;
  roleName: string;
  currentPermissions: string[];
}

/** Libellés FR des rôles (map locale pour rester client-pur, sans importer lib/auth/rbac). */
const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.EDITOR]: 'Éditeur',
  [ROLES.SUPERVISOR]: 'Superviseur',
  [ROLES.USER]: 'Utilisateur',
  [ROLES.GUEST]: 'Invité',
};

/** Catalogue dédupliqué : PERMISSIONS contient des alias (kebab + UPPER_SNAKE)
    pointant vers les mêmes codes — sans Set, les keys React seraient dupliquées. */
const ALL_PERMISSIONS = [...new Set(Object.values(PERMISSIONS))];

interface RoleDetailsResponse {
  success: boolean;
  data?: { id: string; role: string; permissions: string[] };
  error?: { message?: string };
}


export function RBACSettings({ roleId, roleName, currentPermissions }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<string>(roleName);
  const [isLoadingRole, setIsLoadingRole] = useState(false);

  const form = useForm<RbacValues>({
    resolver: zodResolver(rbacSchema),
    defaultValues: { roleId, permissions: currentPermissions },
  });

  /**
   * Changement de rôle via le dropdown : charge les permissions réelles du rôle
   * depuis GET /api/roles/[role] et met à jour le formulaire.
   */
  const handleRoleChange = async (role: string) => {
    if (role === selectedRole) return;
    setSelectedRole(role);
    setIsLoadingRole(true);
    try {
      const res = await fetch(`/api/roles/${encodeURIComponent(role)}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const json = (await res.json()) as RoleDetailsResponse;

      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error?.message || `Impossible de charger le rôle « ${role} ».`);
        setSelectedRole(roleName); // retour au rôle précédent
        return;
      }

      const codes = json.data.permissions;
      if (codes.includes('HIDDEN')) {
        // Réponse sanitizée : seul un SUPER_ADMIN voit les permissions réelles.
        toast.error('Permissions masquées : seul un Super Admin peut consulter ce rôle.', {
          duration: 6000,
        });
        setSelectedRole(roleName);
        return;
      }

      form.reset({ roleId: json.data.id, permissions: codes });
      toast.success(`Rôle « ${ROLE_LABELS[role] ?? role} » chargé (${codes.length} permission(s)).`);
    } catch {
      toast.error('Erreur réseau lors du chargement du rôle.');
      setSelectedRole(roleName);
    } finally {
      setIsLoadingRole(false);
    }
  };

  const onSubmit = (data: RbacValues) => {
    startTransition(async () => {
      const res = await syncRolePermissionsAction(data);
      toast[res.success ? 'success' : 'error'](res.success ? 'Permissions mises à jour' : res.error!);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Rôle : {ROLE_LABELS[selectedRole] ?? selectedRole}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sélecteur du rôle concerné */}
        <div className="mb-6 flex items-center gap-3">
          <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <label htmlFor="rbac-role-select" className="text-sm font-medium">
              Rôle concerné
            </label>
            <Select value={selectedRole} onValueChange={handleRoleChange} disabled={isLoadingRole || isPending}>
              <SelectTrigger id="rbac-role-select" className="w-56" aria-label="Sélectionner le rôle">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent className="bg-cyan-100 text-cyan-400">
                {Object.values(ROLES).map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role] ?? role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLoadingRole && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            {ALL_PERMISSIONS.map((perm) => (
              <FormField key={perm} control={form.control} name="permissions" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value?.includes(perm)}
                      onCheckedChange={(checked) => {
                        const updated = checked
                          ? [...field.value, perm]
                          : field.value?.filter((v) => v !== perm);
                        field.onChange(updated);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">{perm.replace(/_/g, ' ')}</FormLabel>
                </FormItem>
              )} />
            ))}
            <Button type="submit" disabled={isPending || isLoadingRole} className="col-span-2 mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Sauvegarde…' : 'Sauvegarder les permissions'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
