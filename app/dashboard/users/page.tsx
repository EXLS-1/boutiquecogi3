// app/dashboard/users/page.tsx
// Gestion des utilisateurs avec RBAC strict
// Level 2+ (Admin+) : lecture | Level 1 (Super Admin) : modification des rôles

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Role as PrismaRole } from "@prisma/client";
import { getServerRBACSession } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

import { UsersTable } from "@/components/dashboard/users/users-table";
import { UserStats } from "@/components/dashboard/users/user-stats";
import { RoleManager } from "@/components/dashboard/users/role-manager";
import { Skeleton } from "@/components/ui/skeleton";

interface UsersPageProps {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getServerRBACSession();
  if (!session) redirect("/auth/signin");

  const { level, userId, effectivePermissions } = session;

  if (level > 2) redirect("/unauthorized");

  const canCreate = effectivePermissions.has("users:create");
  const canUpdate = effectivePermissions.has("users:update");
  const canDelete = effectivePermissions.has("users:delete");
  const canBan = effectivePermissions.has(
    "users:ban" as Parameters<typeof effectivePermissions.has>[0],
  );
  const canManageRoles = effectivePermissions.has(
    "settings:manage_roles" as Parameters<typeof effectivePermissions.has>[0],
  );
  const canImpersonate = effectivePermissions.has("users:impersonate");
  const canExport = effectivePermissions.has("users:export");

  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = 25;
  const roleFilter = Object.values(PrismaRole).includes(params.role as PrismaRole)
    ? (params.role as PrismaRole)
    : undefined;

  const where = {
    AND: [
      ...(roleFilter ? [{ roleConfig: { role: roleFilter } }] : []),
      ...(params.status ? [{ status: params.status }] : []),
      // Un admin (level 2) ne peut pas voir/modifier les super admins (level 1)
      ...(level === 2 ? [{ roleConfig: { level: { gt: 1 } } }] : []),
    ],
  };

  const [rawUsers, total, rawRoles, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        roleConfig: { select: { id: true, role: true, level: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.roleConfig.findMany({
      select: { id: true, role: true, level: true, isSystem: true },
      orderBy: { level: "asc" },
    }),
    prisma.user.groupBy({ by: ["status"] as ["status"], _count: { id: true } }),
  ]);

  const roles = rawRoles.map((role) => ({
    id: role.id,
    name: role.role,
    level: role.level,
    color: null,
    isSystem: role.isSystem,
  }));
  const users = rawUsers.map((user) => ({
    ...user,
    role: user.roleConfig
      ? { id: user.roleConfig.id, name: user.roleConfig.role, level: user.roleConfig.level, color: null }
      : { id: "unassigned", name: "UNASSIGNED", level: 7, color: null },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            {total} utilisateur{total > 1 ? "s" : ""}
            {level === 2 && <span className="text-destructive"> · Super admins cachés</span>}
          </p>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-32" />}>
        <UserStats stats={stats} />
      </Suspense>

      {canManageRoles && level <= 1 && (
        <Suspense fallback={<Skeleton className="h-64" />}>
          <RoleManager roles={roles} />
        </Suspense>
      )}

      <Suspense fallback={<Skeleton className="h-96" />}>
        <UsersTable
          users={users}
          total={total}
          page={page}
          limit={limit}
          roles={roles}
          currentUserLevel={level}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canBan={canBan}
          canManageRoles={canManageRoles}
          canImpersonate={canImpersonate}
          canExport={canExport}
        />
      </Suspense>
    </div>
  );
}
