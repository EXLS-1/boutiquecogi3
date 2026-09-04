// components/admin/roles/RoleFormModal.tsx — Module 3 : création / édition.
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { ROLES_CONSTANTS } from '@/constants/roles';
import { roleFormSchema, type RoleFormSchemaType } from '@/lib/roles/role-schema';
import { createRoleAction, updateRoleAction } from '@/lib/roles/role-actions';
import { useRoleStore } from '@/store/roles/use-role-store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const M = ROLES_CONSTANTS.MESSAGES;

export function RoleFormModal() {
  const router = useRouter();
  const { isFormOpen, selectedRole, closeForm } = useRoleStore();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEditing = !!selectedRole;

  const form = useForm<RoleFormSchemaType>({
    resolver: zodResolver(roleFormSchema) as Resolver<RoleFormSchemaType>,
    defaultValues: {
      name: selectedRole?.name ?? '',
      level: selectedRole?.level ?? ROLES_CONSTANTS.DEFAULT_LEVEL,
      description: selectedRole?.description ?? '',
      defaultPermissionCodes:
        selectedRole?.permissions.map((p) => p.code) ??
        [...ROLES_CONSTANTS.DEFAULT_PERMISSION_CODES],
      isActive: selectedRole?.isActive ?? true,
    },
  });

  React.useEffect(() => {
    if (isFormOpen) {
      form.reset({
        name: selectedRole?.name ?? '',
        level: selectedRole?.level ?? ROLES_CONSTANTS.DEFAULT_LEVEL,
        description: selectedRole?.description ?? '',
        defaultPermissionCodes:
          selectedRole?.permissions.map((p) => p.code) ??
          [...ROLES_CONSTANTS.DEFAULT_PERMISSION_CODES],
        isActive: selectedRole?.isActive ?? true,
      });
    }
  }, [isFormOpen, selectedRole, form]);

  const onSubmit = async (values: RoleFormSchemaType) => {
    setIsSubmitting(true);
    try {
      if (isEditing && selectedRole) {
        const res = await updateRoleAction(selectedRole.id, {
          description: values.description,
          isActive: values.isActive,
          defaultPermissionCodes: values.defaultPermissionCodes,
        });
        if (!res.success) throw new Error(res.error || M.ERROR_GENERIC);
        toast.success(M.UPDATE_SUCCESS);
      } else {
        const res = await createRoleAction(values);
        if (!res.success) throw new Error(res.error || M.ERROR_GENERIC);
        toast.success(M.CREATE_SUCCESS);
      }
      closeForm();
      form.reset();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : M.ERROR_GENERIC);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isFormOpen) return null;

  return (
    <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Éditer le rôle : ${selectedRole.name}` : 'Créer un Rôle'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez la description et le statut. Le nom et le niveau restent immuables.'
              : 'Définissez le nom, le niveau hiérarchique et le statut initial.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nom</Label>
            <Input
              id="role-name"
              placeholder="EX: MODERATEUR"
              disabled={isEditing}
              {...form.register('name')}
              onChange={(e) => {
                const upper = e.target.value.toUpperCase().replace(/\s+/g, '_');
                form.setValue('name', upper, { shouldValidate: true });
              }}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-level">Niveau hiérarchique</Label>
            <Select
              value={String(form.watch('level'))}
              disabled={isEditing}
              onValueChange={(v) => form.setValue('level', Number(v), { shouldValidate: true })}
            >
              <SelectTrigger id="role-level" className="w-full">
                <SelectValue placeholder="Choisir un niveau" />
              </SelectTrigger>
              <SelectContent>
                {ROLES_CONSTANTS.FORM_LEVELS.map((lvl) => (
                  <SelectItem key={lvl.value} value={String(lvl.value)}>
                    {lvl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.level && (
              <p className="text-xs text-destructive">{form.formState.errors.level.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              placeholder="Description du rôle…"
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label htmlFor="role-active" className="font-medium">Statut actif</Label>
              <p className="text-xs text-muted-foreground">Autorise l&apos;utilisation de ce rôle.</p>
            </div>
            <Switch
              id="role-active"
              checked={form.watch('isActive')}
              onCheckedChange={(v) => form.setValue('isActive', v === true)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}