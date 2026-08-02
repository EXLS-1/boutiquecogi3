// server/services/product-service.ts

import { withSecurePrisma, type SecureContext } from '@/server/core/secure-prisma'
import { PERMISSIONS, hasPermissionOnResult } from '@/lib/auth/rbac'
import { generateUUIDv7 } from '@/lib/utils/uuid'
import { StockService } from './stock-service'

export class ProductServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'ProductServiceError'
  }
}

// ─── Helpers de génération ───

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100)
}

function generateSKU(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 6)
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${suffix}`
}

// ─── Service ───

export const ProductService = {
  // ─── Créer un produit (Editor+) ───
  async create(input: {
    id?: string
    name: string
    slug?: string
    sku?: string
    description?: string | null
    basePrice: number
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
    categoryId?: string | null
    images?: string[]
  }) {
    // Validation manuelle des champs requis
    if (!input.name?.trim() || typeof input.basePrice !== 'number') {
      throw new ProductServiceError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const product = await ctx.prisma.product.create({
          data: {
            id: input.id ?? generateUUIDv7(),
            name: input.name.trim(),
            slug: input.slug ?? generateSlug(input.name),
            sku: input.sku ?? generateSKU(input.name),
            description: input.description ?? '',
            basePrice: input.basePrice,
            status: input.status ?? 'ACTIVE',
            categoryId: input.categoryId,
            images: input.images ?? [],
            userId: ctx.userId,
          }
        })

        // Création automatique du stock à 0
        await StockService.createForProduct(product.id, 0, ctx.userId)

        return product
      },
      {
        minRoleLevel: 4, // EDITOR minimum
        requiredPermissions: [PERMISSIONS['products:create']],
        auditLog: true,
      }
    )
  },

  // ─── Modifier un produit (propriétaire OU Admin+) ───
  async update(
    productId: string,
    data: {
      name?: string
      basePrice?: number
      description?: string | null
      categoryId?: string | null
      images?: string[]
      status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED'
      slug?: string
    }
  ) {
    return withSecurePrisma(
      async (ctx) => {
        const product = await ctx.prisma.product.findUnique({
          where: { id: productId }
        })

        if (!product) throw new ProductServiceError('Produit non trouvé', 'NOT_FOUND')

        const isOwner = product.userId === ctx.userId
        const canEditAny = hasPermissionOnResult(ctx.roleData, PERMISSIONS['products:update'])

        if (!isOwner && !canEditAny) {
          throw new ProductServiceError(
            'Vous ne pouvez modifier que vos propres produits',
            'NOT_OWNER'
          )
        }

        // Régénère le slug automatiquement si le nom change et pas de slug fourni
        const slug = data.slug ?? (data.name ? generateSlug(data.name) : undefined)

        return ctx.prisma.product.update({
          where: { id: productId },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
            ...(data.images !== undefined && { images: data.images }),
            ...(data.status !== undefined && { status: data.status }),
            ...(slug !== undefined && { slug }),
            updatedAt: new Date(),
          }
        })
      },
      {
        minRoleLevel: 4,
        requiredPermissions: [PERMISSIONS['products:update']],
        auditLog: true,
      }
    )
  },

  // ─── Supprimer un produit (propriétaire OU Super Admin+) ───
  async delete(productId: string) {
    return withSecurePrisma(
      async (ctx) => {
        const product = await ctx.prisma.product.findUnique({
          where: { id: productId }
        })

        if (!product) throw new ProductServiceError('Produit non trouvé', 'NOT_FOUND')

        const isOwner = product.userId === ctx.userId
        const canDeleteAny = hasPermissionOnResult(ctx.roleData, PERMISSIONS['products:delete'])

        if (!isOwner && !canDeleteAny) {
          throw new ProductServiceError(
            'Vous ne pouvez supprimer que vos propres produits',
            'NOT_OWNER'
          )
        }

        return ctx.prisma.product.delete({ where: { id: productId } })
      },
      {
        minRoleLevel: 4,
        requiredPermissions: [PERMISSIONS['products:delete']],
        auditLog: true,
      }
    )
  },

  // ─── Voir tous les produits (tout utilisateur authentifié) ───
  async listAll() {
    return withSecurePrisma(
      async (ctx) => {
        return ctx.prisma.product.findMany({
          include: {
            user: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } },
            stock: true
          },
          orderBy: { createdAt: 'desc' }
        })
      },
      {
        minRoleLevel: 1,
        auditLog: false,
      }
    )
  },

  // ─── Voir un produit spécifique ───
  async getById(productId: string) {
    return withSecurePrisma(
      async (ctx) => {
        return ctx.prisma.product.findUnique({
          where: { id: productId },
          include: {
            user: { select: { id: true, name: true } },
            category: true,
            stock: {
              include: {
                movements: {
                  orderBy: { createdAt: 'desc' },
                  take: 10
                }
              }
            }
          }
        })
      },
      {
        minRoleLevel: 1,
        auditLog: false,
      }
    )
  },

  // ─── Suppression massive (Super Admin uniquement) ───
  async bulkDelete(productIds: string[]) {
    return withSecurePrisma(
      async (ctx) => {
        if (ctx.roleLevel > 2) {
          throw new ProductServiceError(
            'Opération réservée aux Super Admin et Owner',
            'INSUFFICIENT_LEVEL'
          )
        }

        return ctx.prisma.product.deleteMany({
          where: { id: { in: productIds } }
        })
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS['products:delete']],
        blockDangerous: true,
        auditLog: true,
      }
    )
  }
}
