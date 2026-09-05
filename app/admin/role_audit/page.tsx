import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { RoleModuleNav } from '@/components/admin/roles/RoleModuleNav';
import { RoleAuditPanel } from '@/components/admin/roles/RoleAuditPanel';
import { RoleAdminService } from '@/server/services/role-admin-service';

export const metadata: Metadata = { title: 'Assignments et audit des rôles', robots: 'noindex, nofollow' };

export default async function RoleAuditPage() {
  const [roles, auditLogs] = await Promise.all([
    RoleAdminService.listRoles(),
    RoleAdminService.listAuditLogs(),
  ]);
  const assignments = (await Promise.all(roles.map((role) => RoleAdminService.listAssignments(role.id))))
    .flat()
    .map((assignment) => ({ ...assignment, roleId: assignment.roleId }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <RoleModuleNav />
      <header><h1 className="text-3xl font-bold text-slate-950">Assignments & audit</h1><p className="mt-1 text-slate-600">Suivi des utilisateurs assignés, overrides et changements de droits.</p></header>
      <RoleAuditPanel roles={roles.map((role) => ({ id: role.id, role: role.name, level: role.level }))} assignments={assignments} auditLogs={auditLogs} />
    </main>
  );
}
