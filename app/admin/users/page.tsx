// app/admin/users/page.tsx
import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Role as PrismaRole } from '@prisma/client';

import { getServerRBACSession } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

import { StatsCards } from '@/components/admin/users/stats-cards';
import { UsersTable } from '@/components/admin/users/users-table';
import { RoleManager } from '@/components/admin/users/role-manager';
import { Skeleton } from '@/components/ui/skeleton';

// Typage strict des paramètres de recherche pour la pagination et les filtres
interface AdminUsersPageProps {
  searchParams: Promise<{ role?: string; status?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  // 1. SÉCURITÉ & RBAC (Anti-fragile)
  // Vérification stricte de la session côté serveur avant tout rendu
  const session = await getServerRBACSession();
  if (!session) {
    redirect('/auth/sign-in');
  }

  const { level, effectivePermissions } = session;

  // Principe de moindre privilège : refus d'accès si niveau insuffisant (> 2)
  if (level > 2) {
    redirect('/unauthorized');
  }

  // 2. PERMISSIONS (Modulaire et testable)
  // Utilisation de l'assertion de type pour satisfaire TypeScript sans 'any' sauvage
  const canUpdate = effectivePermissions.has('users:update');
  const canDelete = effectivePermissions.has('users:delete');
  const canBan = effectivePermissions.has('users:ban' as Parameters<typeof effectivePermissions.has>[0]);
  const canManageRoles = effectivePermissions.has('settings:manage_roles' as Parameters<typeof effectivePermissions.has>[0]);
  const canImpersonate = effectivePermissions.has('users:impersonate');
  const canExport = effectivePermissions.has('users:export');

  // 3. PARAMÈTRES & FILTRES (DRY et sécurisé)
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const limit = 25; // Constante de pagination, facilement extractible dans '@/lib/constants' si besoin
  
  // Validation stricte du filtre de rôle contre l'enum Prisma
  const roleFilter = Object.values(PrismaRole).includes(params.role as PrismaRole)
    ? (params.role as PrismaRole)
    : undefined;

  // Construction dynamique et sécurisée de la clause WHERE
  const where = {
    AND: [
      ...(roleFilter ? [{ roleConfig: { role: roleFilter } }] : []),
      ...(params.status ? [{ status: params.status }] : []),
      // Un admin (level 2) ne peut jamais voir ni modifier les super admins (level 1)
      ...(level === 2 ? [{ roleConfig: { level: { gt: 1 } } }] : []),
    ],
  };

  // 4. REQUÊTES BASE DE DONNÉES (Performance & Scalabilité)
  // Exécution parallèle pour minimiser la latence. Bloc catch global pour la robustesse.
  const [rawUsers, total, rawRoles, stats] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        roleConfig: { select: { id: true, role: true, level: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.roleConfig.findMany({
      select: { id: true, role: true, level: true, isSystem: true },
      orderBy: { level: 'asc' },
    }),
    prisma.user.groupBy({ 
      by: ['status'], 
      _count: { id: true } 
    }),
  ]).catch((error) => {
    console.error('[AdminUsersPage] Échec critique du chargement des données:', error);
    // Fallback anti-fragile : on pourrait rediriger vers une page d'erreur 500 personnalisée
    throw new Error('Échec du chargement des données utilisateurs. Veuillez réessayer.');
  });

  // 5. NORMALISATION DES DONNÉES (Lisible et maintenable)
  const roles = rawRoles.map((role) => ({
    id: role.id,
    name: role.role,
    level: role.level,
    color: null, // À mapper avec votre design system (ex: roleColors[role.role])
    isSystem: role.isSystem,
  }));

  const users = rawUsers.map((user) => ({
    ...user,
    role: user.roleConfig
      ? { 
          id: user.roleConfig.id, 
          name: user.roleConfig.role, 
          level: user.roleConfig.level, 
          color: null 
        }
      : { id: 'unassigned', name: 'UNASSIGNED', level: 7, color: null },
  }));

  // Helper interne pour sécuriser l'extraction des statistiques (évite les undefined)
  const getStatCount = (statusValue: string) => 
    stats.find((s) => s.status === statusValue)?._count.id ?? 0;

  const normalizedStats = {
    total,
    verified: getStatCount('VERIFIED'),
    twoFactor: 0, // À adapter si un champ 'twoFactorEnabled' existe dans le modèle User
    blocked: getStatCount('BLOCKED'),
    deleted: getStatCount('DELETED'),
  };

  // 6. RENDU ATOMIQUE ET MINIMALISTE
  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* En-tête */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Gestion des Utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">
            {total} utilisateur{total > 1 ? 's' : ''}
            {level === 2 && (
              <span className="text-destructive font-medium"> · Super admins masqués</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/account"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-cyan-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
          >
            Comptes
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-900 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:ring-offset-2"
          >
            Portail Admin
          </Link>
        </div>
      </header>

      {/* Cartes de statistiques (Atomique + Suspense) */}
      <Suspense fallback={<Skeleton className="h-32 w-full rounded-xl" />}>
        <StatsCards stats={normalizedStats} />
      </Suspense>

      {/* Gestionnaire de rôles (Conditionnel, sécurisé et atomique) */}
      {canManageRoles && level <= 1 && (
        <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
          <RoleManager roles={roles} />
        </Suspense>
      )}

      {/* Tableau de données (Atomique + Suspense + Pagination) */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
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
