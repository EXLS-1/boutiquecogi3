// components/dashboard/settings/rbac-settings.tsx
'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { syncRolePermissionsAction } from '@/lib/actions/rbac';
import { rbacSchema, type RbacValues, PERMISSIONS, ROLES } from '@/lib/rbac';

interface Props {
  roleId: string;
  roleName: string;
  currentPermissions: string[];
}

export function RBACSettings({ roleId, roleName, currentPermissions }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<RbacValues>({
    resolver: zodResolver(rbacSchema),
    defaultValues: { roleId, permissions: currentPermissions },
  });

  const onSubmit = (data: RbacValues) => {
    startTransition(async () => {
      const res = await syncRolePermissionsAction(data);
      toast[res.success ? 'success' : 'error'](res.success ? 'Permissions mises à jour' : res.error!);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Rôle : {roleName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
            {Object.values(PERMISSIONS).map((perm) => (
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
            <Button type="submit" disabled={isPending} className="col-span-2 mt-4">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sauvegarder les permissions
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
