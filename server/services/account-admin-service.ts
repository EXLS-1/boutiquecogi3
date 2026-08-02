// server/services/account-admin-service.ts
// ============================================
// AccountAdminService — Gestion admin des comptes (Account model)
// ============================================
// Sécurité : Toutes les opérations passent par withSecurePrisma
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

// ─── Types exports ──────────────────────────

export interface AccountListItem {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  expiresAt: number | null
  /** Compteur pour le tri — pas de createdAt sur le modèle Account */
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

// ─── Helpers Prisma type-safe ───────────────

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

// ─── Service ─────────────────────────────────

export const AccountAdminService = {
  /**
   * Lister les comptes avec pagination et filtres (Admin+)
   */
  async list(input?: Partial<ListAccountsInput>): Promise<ListAccountsResult> {
    const parsed = listAccountsSchema.safeParse(input ?? {})
    if (!parsed.success) {
      throw new AccountAdminServiceError('Données de filtre invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { search, provider, type, page, pageSize, sortBy, sortOrder } = parsed.data

        // Construction du filtre WHERE
        const where: PrismaAccountWhere = {}

        if (provider && provider !== 'ALL') {
          where.provider = provider
        }

        if (type && type !== 'ALL') {
          where.type = type
        }

        if (search.trim()) {
          const q = search.toLowerCase()
          where.OR = [
            { provider: { contains: q, mode: 'insensitive' } },
            { providerAccountId: { contains: q, mode: 'insensitive' } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
          ]
        }

        // Tri
        const orderBy: PrismaAccountOrderBy = sortBy === 'userEmail'
          ? { user: { email: sortOrder } }
          : { [sortBy]: sortOrder }

        // Requête parallèle : comptage + données
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
          provider: acc.provider,
          providerAccountId: acc.providerAccountId,
          expiresAt: acc.expires_at,
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
   * Récupérer les détails complets d'un compte (Admin+)
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
          throw new AccountAdminServiceError('Compte non trouvé', 'NOT_FOUND')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = account as any

        return {
          id: a.id,
          userId: a.userId,
          type: a.type,
          provider: a.provider,
          providerAccountId: a.providerAccountId,
          expiresAt: a.expires_at,
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
   * Supprimer un compte avec vérifications de sécurité (Admin+)
   */
  async delete(input: DeleteAccountInput): Promise<{ success: boolean; deletedAccountId: string; userEmail: string }> {
    const parsed = deleteAccountSchema.safeParse(input)
    if (!parsed.success) {
      throw new AccountAdminServiceError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const { accountId, reason } = parsed.data

        // 1. Vérifier que le compte existe
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
          throw new AccountAdminServiceError('Compte non trouvé', 'NOT_FOUND')
        }

        // 2. Vérifier que ce n'est pas le seul compte de l'utilisateur
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
              deletedAccountProvider: account.provider,
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
   * Récupérer la liste de tous les providers distincts (pour filtres)
   */
  async getDistinctProviders(): Promise<string[]> {
    return withSecurePrisma(
      async (ctx) => {
        const result = await ctx.prisma.account.findMany({
          select: { provider: true },
          distinct: ['provider'],
          orderBy: { provider: 'asc' },
        })
        return result.map((r) => r.provider)
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS['users:view:any']],
      }
    )
  },
}

