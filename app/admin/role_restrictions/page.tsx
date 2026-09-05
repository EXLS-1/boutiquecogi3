import type { Metadata } from 'next';
import { RoleAdminService } from '@/server/services/role-admin-service';
import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleRestrictionsPanel } from '@/components/admin/roles/RoleRestrictionsPanel';

export const metadata: Metadata = { title: 'Restrictions des rôles', robots: 'noindex, nofollow' };

export default async function RoleRestrictionsPage() {
	const roles = await RoleAdminService.listRoles();
	return <main className="mx-auto max-w-6xl space-y-6 p-6"><RoleModuleNav /><header><h1 className="text-3xl font-bold text-slate-950">Restrictions</h1><p className="mt-1 text-slate-600">Seules les clés validées par le schéma métier peuvent être modifiées.</p></header><RoleRestrictionsPanel roles={roles.map((role) => ({ id: role.id, role: role.name, level: role.level, restrictions: role.restrictions }))} /></main>;
}
