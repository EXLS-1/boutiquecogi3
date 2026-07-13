// server/services/product-service.ts

import { withSecurePrisma, type SecureContext } from '@/server/core/secure-prisma'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product'
import { PERMISSIONS, hasPermissionOnResult } from '@/lib/auth/rbac'
import { z } from 'zod'

export class ProductServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'ProductServiceError'
  }
}

export const ProductService = {
  // ─── Créer un produit (Editor+) ───
  async create(input: z.infer<typeof createProductSchema>) {
    const parsed = createProductSchema.safeParse(input)
    if (!parsed.success) {
      throw new ProductServiceError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        return ctx.prisma.product.create({
          data: {
            name: parsed.data.name,
            price: parsed.data.price,
            description: parsed.data.description,
            categoryId: parsed.data.categoryId,
            images: parsed.data.images,
            stock: parsed.data.stock,
            sellerId: ctx.userId,
            createdBy: ctx.userId,
          }
        })
      },
      {
        minRoleLevel: 4, // EDITOR minimum
        requiredPermissions: [PERMISSIONS['products:create']],
        auditLog: true,
      }
    )
  },

  // ─── Modifier un produit (propriétaire OU Admin+) ───
  async update(productId: string, data: z.infer<typeof updateProductSchema>) {
    const parsed = updateProductSchema.safeParse(data)
    if (!parsed.success) {
      throw new ProductServiceError('Données invalides', 'VALIDATION_ERROR')
    }

    return withSecurePrisma(
      async (ctx) => {
        const product = await ctx.prisma.product.findUnique({
          where: { id: productId }
        })

        if (!product) throw new ProductServiceError('Produit non trouvé', 'NOT_FOUND')

        const isOwner = product.sellerId === ctx.userId
        const canEditAny = hasPermissionOnResult(ctx.roleData, PERMISSIONS['products:update'])

        if (!isOwner && !canEditAny) {
          throw new ProductServiceError(
            'Vous ne pouvez modifier que vos propres produits',
            'NOT_OWNER'
          )
        }

        return ctx.prisma.product.update({
          where: { id: productId },
          data: {
            ...parsed.data,
            updatedBy: ctx.userId,
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

        const isOwner = product.sellerId === ctx.userId
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
            seller: { select: { id: true, name: true, email: true } },
            category: { select: { id: true, name: true } }
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
            seller: { select: { id: true, name: true } },
            category: true,
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
