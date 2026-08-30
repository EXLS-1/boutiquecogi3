// lib/admin/accounts.ts
import { prisma } from '@/lib/prisma';

export type AccountListItem = {
  id: string;
  providerId: string;
  type: string;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  accessTokenExpiresAt: Date | null;
  hasPassword: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    isBlocked: boolean;
    isDeleted: boolean;
  } | null;
};

export type AccountStats = {
  total: number;
  uniqueUsers: number;
  providersCount: number;
  withPassword: number;
  withRefreshToken: number;
  withAccessToken: number;
};

export type DeletedAccountItem = {
  id: string;
  userId: string;
  providerId: string;
  deletedAt: Date;
  reason?: string | null;
};

export async function getActiveAccountsData(params: {
  page: number;
  pageSize: number;
  search?: string;
  provider?: string;
  type?: string;
}) {
  const { page, pageSize, search, provider, type } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(search ? { OR: [{ accountId: { contains: search } }, { user: { email: { contains: search } } }] } : {}),
    ...(provider && provider !== 'ALL' ? { providerId: provider } : {}),
    ...(type && type !== 'ALL' ? { type: type } : {}),
  };

  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      select: {
        id: true, providerId: true, type: true, accountId: true,
        createdAt: true, updatedAt: true, expiresAt: true,
        refreshTokenExpiresAt: true, accessTokenExpiresAt: true,
        password: true, refreshToken: true, accessToken: true,
        user: {
          select: {
            id: true, name: true, email: true,
            userSecurities: { select: { isBlocked: true }, take: 1 },
            userAudit: { select: { isDeleted: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.account.count({ where }),
  ]);

  // Calcul des stats globales (optimisé)
  const statsData = await prisma.account.groupBy({
    by: ['providerId', 'userId'],
    _count: { id: true },
  });

  const uniqueUsers = new Set(statsData.map((d) => d.userId)).size;
  const providersCount = new Set(statsData.map((d) => d.providerId)).size;

  // Note: Pour des volumes très élevés, ces compteurs devraient être agrégés via des requêtes spécifiques
  const [withPassword, withRefresh, withAccess] = await Promise.all([
    prisma.account.count({ where: { password: { not: null } } }),
    prisma.account.count({ where: { refreshToken: { not: null } } }),
    prisma.account.count({ where: { accessToken: { not: null } } }),
  ]);

  const formattedAccounts: AccountListItem[] = accounts.map((a) => ({
    ...a,
    hasPassword: !!a.password,
    hasRefreshToken: !!a.refreshToken,
    hasAccessToken: !!a.accessToken,
    user: a.user ? {
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      isBlocked: a.user.userSecurities[0]?.isBlocked ?? false,
      isDeleted: a.user.userAudit?.isDeleted ?? false,
    } : null,
    // On ne retourne JAMAIS les valeurs brutes des tokens/mots de passe au client
  }));

  return {
    accounts: formattedAccounts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    stats: { total, uniqueUsers, providersCount, withPassword, withRefreshToken: withRefresh, withAccessToken: withAccess },
  };
}

export async function getDeletedAccountsData(params: { page: number; pageSize: number }) {
  const { page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  // Adapté selon votre schéma Prisma réel pour le registre des supprimés
  const [entries, total] = await Promise.all([
    prisma.account.findMany({
      where: { user: { userAudit: { isDeleted: true } } },
      select: { id: true, providerId: true, userId: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.account.count({ where: { user: { userAudit: { isDeleted: true } } } }),
  ]);

  return {
    entries: entries.map((e) => ({ id: e.id, userId: e.userId, providerId: e.providerId, deletedAt: e.updatedAt })) as DeletedAccountItem[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
