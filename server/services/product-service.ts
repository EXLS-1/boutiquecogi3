// server/services/product-service.ts

import { withSecurePrisma, type SecureContext } from '@/server/core/secure-prisma'
import { z } from 'zod'

const createProductSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  description: z.string().optional(),
})

export const ProductService = {
  // ─── Créer un produit (Vendeur+) ───
  async create(input: z.infer<typeof createProductSchema>) {
    return withSecurePrisma(
      async (ctx) => {
        // ctx contient: userId, roleLevel, roleName, roleData, prisma
        
        return ctx.prisma.product.create({
          data: {
            ...input,
            sellerId: ctx.userId, // Traçabilité automatique
            createdBy: ctx.userId,
          }
        })
      },
      {
        minRoleLevel: 3, // VENDEUR minimum
        requiredPermissions: ['product:create'],
        auditLog: true,
      }
    )
  },

  // ─── Modifier un produit (propriétaire OU Admin) ───
  async update(productId: string, data: Partial<z.infer<typeof createProductSchema>>) {
    return withSecurePrisma(
      async (ctx) => {
        const product = await ctx.prisma.product.findUnique({
          where: { id: productId }
        })

        if (!product) throw new Error('Produit non trouvé')

        // Vérification propriétaire OU permission élevée
        const isOwner = product.sellerId === ctx.userId
        const canEditAny = hasPermission(ctx.roleData, 'product:edit:any')

        if (!isOwner && !canEditAny) {
          throw new Error('Vous ne pouvez modifier que vos produits')
        }

        return ctx.prisma.product.update({
          where: { id: productId },
          data: {
            ...data,
            updatedBy: ctx.userId,
            updatedAt: new Date(),
          }
        })
      },
      {
        minRoleLevel: 3,
        requiredPermissions: ['product:edit:own'], // Au minimum ses propres produits
        auditLog: true,
      }
    )
  },

  // ─── Supprimer n'importe quel produit (Admin+) ───
  async deleteAny(productId: string) {
    return withSecurePrisma(
      async (ctx) => {
        return ctx.prisma.product.delete({
          where: { id: productId }
        })
      },
      {
        minRoleLevel: 6, // SUPER_ADMIN
        requiredPermissions: ['product:delete:any'],
        auditLog: true,
      }
    )
  },

  // ─── Voir tous les produits (tout le monde authentifié) ───
  async listAll() {
    return withSecurePrisma(
      async (ctx) => {
        return ctx.prisma.product.findMany({
          include: { seller: { select: { name: true } } }
        })
      },
      {
        minRoleLevel: 1, // N'importe quel utilisateur authentifié
        auditLog: false,
      }
    )
  },

  // ─── Opération dangereuse : suppression massive (Owner uniquement) ───
  async bulkDelete(productIds: string[]) {
    return withSecurePrisma(
      async (ctx) => {
        // Double vérification explicite
        if (ctx.roleLevel < 7) {
          throw new Error('Opération réservée au propriétaire')
        }

        return ctx.prisma.product.deleteMany({
          where: { id: { in: productIds } }
        })
      },
      {
        minRoleLevel: 7, // OWNER
        requiredPermissions: ['product:delete:any'],
        blockDangerous: true,
        auditLog: true,
        customCheck: (ctx) => ctx.roleData.metadata.dangerousPermissions.includes('product:delete:any'),
      }
    )
  }
}