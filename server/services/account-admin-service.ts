// server/services/account-admin-service.ts
// ============================================
// AccountAdminService â€” Gestion admin des comptes (Account model)
// ============================================
// SÃ©curitÃ© : Toutes les opÃ©rations passent par withSecurePrisma
// RBAC requis : ADMIN+ (minRoleLevel: 2)
// Permissions : accounts:read, accounts:delete

import { withSecurePrisma } from '@/server/core/secure-prisma'
import { PERMISSIONS } from '@/lib/auth/rbac'
import { generateUUIDv7 } from '@/lib/utils/uuid'
import {
  listAccountsSchema,
  deleteAccountSchema,
  getAccountSchema,
  type ListAccountsInput,
  type DeleteAccountInput,
  type GetAccountInput,
} from '@/lib/validations/account'

export class AccountAdminServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'AccountAdminServiceError'
  }
}

// â”€â”€â”€ Types exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AccountListItem {
  id: string
  userId: string
  type: string
  providerId: string
  accountId: string
  expiresAt: number | null
  /** Compteur pour le tri â€” pas de createdAt sur le modÃ¨le Account */
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export interface AccountDetail extends AccountListItem {
  password: string | null
  refreshToken: string | null
  accessToken: string | null
  tokenType: string | null
  scope: string | null
  idToken: string | null
  sessionState: string | null
}

export interface ListAccountsResult {
  accounts: AccountListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// â”€â”€â”€ Helpers Prisma type-safe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type PrismaAccountWhere = NonNullable<
  Parameters<
    InstanceType<typeof import('@prisma/client').PrismaClient>['account']['findMany']
  >[0]
>['where']

type PrismaAccountOrderBy = NonNullable<
  Parameters<
    InstanceType<typeof import('@prisma/client').PrismaClient>['account']['findMany']
  >[0]
>['orderBy']

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AccountAdminService = {
  /**
   * Lister les comptes avec pagination et filtres (Admin+)
   */
  async list(input?: Partial<ListAccountsInput>): Promise<ListAccountsResult> {
    const parsed = listAccountsSchema.safeParse(input ?? {})
    if (!parsed.success) {
      throw new AccountAdminServiceError('DonnÃ©es de filtre invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { search, provider, type, page, pageSize, sortBy, sortOrder } = parsed.data

        // Construction du filtre WHERE
        const where: PrismaAccountWhere = {}

        if (provider && provider !== 'ALL') {
          where.providerId = provider
        }

        if (type && type !== 'ALL') {
          where.type = type
        }

        if (search.trim()) {
          const q = search.toLowerCase()
          where.OR = [
            { providerId: { contains: q, mode: 'insensitive' } },
            { accountId: { contains: q, mode: 'insensitive' } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
          ]
        }

        // Tri
        const orderBy: PrismaAccountOrderBy = sortBy === 'userEmail'
          ? { user: { email: sortOrder } }
          : { [sortBy]: sortOrder }

        // RequÃªte parallÃ¨le : comptage + donnÃ©es
        const [total, rawAccounts] = await Promise.all([
          ctx.prisma.account.count({ where }),
          ctx.prisma.account.findMany({
            where,
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ])

        const accounts: AccountListItem[] = rawAccounts.map((acc) => ({
          id: acc.id,
          userId: acc.userId,
          type: acc.type,
          providerId: acc.providerId,
          accountId: acc.accountId,
          expiresAt: acc.expiresAt ? acc.expiresAt.getTime() : null,
          user: acc.user
            ? {
                id: acc.user.id,
                name: acc.user.name,
                email: acc.user.email,
                image: acc.user.image,
              }
            : null,
        }))

        return {
          accounts,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        }
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['users:view:any']],
        auditLog: false,
      }
    )
  },

  /**
   * RÃ©cupÃ©rer les dÃ©tails complets d'un compte (Admin+)
   */
  async getById(input: GetAccountInput): Promise<AccountDetail> {
    const parsed = getAccountSchema.safeParse(input)
    if (!parsed.success) {
      throw new AccountAdminServiceError('ID de compte invalide', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { accountId } = parsed.data

        const account = await ctx.prisma.account.findUnique({
          where: { id: accountId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        })

        if (!account) {
          throw new AccountAdminServiceError('Compte non trouvÃ©', 'NOT_FOUND')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = account as any

        return {
          id: a.id,
          userId: a.userId,
          type: a.type,
          providerId: a.providerId,
          accountId: a.accountId,
          expiresAt: a.expiresAt ? a.expiresAt.getTime() : null,
          password: a.password,
          refreshToken: a.refresh_token,
          accessToken: a.access_token,
          tokenType: a.token_type,
          scope: a.scope,
          idToken: a.id_token,
          sessionState: a.session_state,
          user: a.user
            ? {
                id: a.user.id,
                name: a.user.name,
                email: a.user.email,
                image: a.user.image,
              }
            : null,
        }
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:view:any']],
      }
    )
  },

  /**
   * Supprimer un compte avec vÃ©rifications de sÃ©curitÃ© (Admin+)
   */
  async delete(input: DeleteAccountInput): Promise<{ success: boolean; deletedAccountId: string; userEmail: string }> {
    const parsed = deleteAccountSchema.safeParse(input)
    if (!parsed.success) {
      throw new AccountAdminServiceError('DonnÃ©es invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { accountId, reason } = parsed.data

        // 1. VÃ©rifier que le compte existe
        const account = await ctx.prisma.account.findUnique({
          where: { id: accountId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                _count: { select: { accounts: true } },
              },
            },
          },
        })

        if (!account) {
          throw new AccountAdminServiceError('Compte non trouvÃ©', 'NOT_FOUND')
        }

        // 2. VÃ©rifier que ce n'est pas le seul compte de l'utilisateur
        if (account.user && account.user._count.accounts <= 1) {
          throw new AccountAdminServiceError(
            `Impossible de supprimer le dernier compte de ${account.user.email}. L'utilisateur doit avoir au moins un moyen de connexion.`,
            'LAST_ACCOUNT'
          )
        }

        // 3. Ne pas supprimer son propre compte email
        if (account.userId === ctx.userId && account.type === 'email') {
          throw new AccountAdminServiceError(
            'Vous ne pouvez pas supprimer votre propre compte email principal',
            'SELF_ACCOUNT_DELETE_FORBIDDEN'
          )
        }

        // 4. Audit log avant suppression
        await ctx.prisma.auditLog.create({
          data: {
            userId: ctx.userId,
            roleLevel: ctx.roleLevel,
            action: 'ACCOUNT_DELETED',
            targetId: accountId,
            targetType: 'ACCOUNT',
            details: JSON.stringify({
              deletedAccountProvider: account.providerId,
              deletedAccountType: account.type,
              userEmail: account.user?.email,
              reason: reason || 'Aucune raison fournie',
              deletedBy: ctx.userId,
            }),
          },
        })

        // 5. Suppression
        await ctx.prisma.account.delete({
          where: { id: accountId },
        })

        return {
          success: true,
          deletedAccountId: accountId,
          userEmail: account.user?.email ?? 'inconnu',
        }
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:block']],
        auditLog: true,
      }
    )
  },

  /**
   * RÃ©cupÃ©rer la liste de tous les providers distincts (pour filtres)
   */
  async getDistinctProviders(): Promise<string[]> {
    return withSecurePrisma(
      async (ctx) => {
        const result = await ctx.prisma.account.findMany({
          select: { providerId: true },
          distinct: ["providerId"],
          orderBy: { providerId: "asc" },
        })
        return result.map((r) => r.providerId)
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:view:any']],
      }
    )
  },
}


