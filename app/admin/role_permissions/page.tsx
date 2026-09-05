import type { Metadata } from 'next';
import { RoleAdminService } from '@/server/services/role-admin-service';
import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RolePermissionsPanel } from '@/components/admin/roles/RolePermissionsPanel';

export const metadata: Metadata = { title: 'Permissions des rôles', robots: 'noindex, nofollow' };

export default async function RolePermissionsPage() {
  const [roles, permissions] = await Promise.all([
    RoleAdminService.listRoles(),
    RoleAdminService.listPermissions(),
  ]);
  return <main className="mx-auto max-w-6xl space-y-6 p-6"><RoleModuleNav /><header><h1 className="text-3xl font-bold text-slate-950">Permissions</h1><p className="mt-1 text-slate-600">Source de vérité : catalogue Permission et relations RolePermission.</p></header><RolePermissionsPanel roles={roles.map((role) => ({ id: role.id, role: role.name, level: role.level, permissionIds: role.permissions.map((permission) => permission.id) }))} permissions={permissions} /></main>;
}
