// lib/admin/users.ts
import { prisma } from '@/lib/prisma';
import type { User, Role } from '@prisma/client';

// Type dérivé pour éviter les 'any' et assurer un typage strict
export type AdminUserListItem = User & {
  _count: { accounts: number; orders: number };
  userSecurities: {
    isBlocked: boolean;
    blockReason: string | null;
    blockedUntil: Date | null;
    twoFactorEnabled: boolean;
  }[];
  userQuotas: { productCount: number }[];
  userAudit: { isDeleted: boolean; deletedAt: Date | null; version: number } | null;
  roleConfig: { role: Role } | null;
  accounts: { password: string | null }[];
};

export type UsersStats = {
  total: number;
  verified: number;
  twoFactor: number;
  blocked: number;
  deleted: number;
};

/**
 * Récupère la liste complète des utilisateurs avec leurs relations
 * et calcule les statistiques globales en une seule requête optimisée.
 */
export async function getAdminUsersData(): Promise<{ users: AdminUserListItem[]; stats: UsersStats }> {
  const users = await prisma.user.findMany({
    include: {
      _count: { select: { accounts: true, orders: true } },
      userSecurities: {
        select: { isBlocked: true, blockReason: true, blockedUntil: true, twoFactorEnabled: true },
      },
      userQuotas: { select: { productCount: true } },
      userAudit: { select: { isDeleted: true, deletedAt: true, version: true } },
      roleConfig: { select: { role: true } },
      accounts: { select: { password: true }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calcul des statistiques en mémoire (rapide pour des volumes d'admin raisonnables)
  const stats: UsersStats = {
    total: users.length,
    verified: users.filter((u) => u.emailVerified).length,
    twoFactor: users.filter((u) => u.userSecurities[0]?.twoFactorEnabled).length,
    blocked: users.filter((u) => u.userSecurities[0]?.isBlocked).length,
    deleted: users.filter((u) => u.userAudit?.isDeleted).length,
  };

  return { users, stats };
}
