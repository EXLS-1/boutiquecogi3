import { redirect } from 'next/navigation';
import { getServerRBACSession } from '@/lib/auth/server';
import { RoleAuditAdmin } from '@/components/admin/role-audit/role-audit-admin';
import { prisma } from '@/lib/prisma';
import { UserAdminService } from '@/server/services/user-admin-service';

export default async function RoleAuditPage() {
  const session = await getServerRBACSession();

  if (!session) {
    redirect('/auth/sign-in?callbackUrl=/Admin/role_audit');
  }

  const level = session.level;
  const roleName = session.role?.name ?? 'USER';

  if (level > 2) {
    redirect('/unauthorized');
  }

  const [users, rawRoles, auditLogs] = await Promise.all([
    UserAdminService.listUsers(),
    prisma.roleConfig.findMany({
      where: { isActive: true },
      select: { id: true, role: true, level: true },
      orderBy: { level: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['ROLE_ASSIGNED', 'USER_BLOCKED', 'USER_UNBLOCKED'] },
      },
      select: {
        id: true,
        action: true,
        targetId: true,
        details: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  // RoleConfig n'a pas de champ `name` libre : on réutilise le Role enum comme libellé.
  const roles = rawRoles.map((r) => ({
    id: r.id,
    role: r.role,
    level: r.level,
    name: r.role,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <RoleAuditAdmin
          currentUserLevel={level}
          currentUserRole={roleName}
          users={users}
          roles={roles}
          auditLogs={auditLogs}
        />
      </div>
    </main>
  );
}
