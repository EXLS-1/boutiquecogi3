// server/services/product-service.ts

import { withSecurePrisma } from '@/server/core/secure-prisma'

export const ProductService = {
  async create(data: CreateProductInput) {
    return withSecurePrisma(
      async (prisma, ctx) => {
        // ICI, tu ES sûr que :
        // - ctx.userId est valide
        // - ctx.roleLevel >= 3 (dans cet exemple)
        // - ctx.permissions contient 'product:create'
        
        return prisma.product.create({
          data: {
            ...data,
            createdBy: ctx.userId, // Traçabilité automatique
          }
        })
      },
      {
        minRoleLevel: 3,
        requiredPermissions: ['product:create'],
        auditLog: true,
      }
    )
  },

  async delete(productId: string) {
    return withSecurePrisma(
      async (prisma, ctx) => {
        // Vérification supplémentaire : le créateur ou un admin peut supprimer
        const product = await prisma.product.findUnique({ where: { id: productId } })
        
        if (!product) throw new Error('Produit non trouvé')
        
        if (product.createdBy !== ctx.userId && ctx.roleLevel < 5) {
          throw new Error('Vous ne pouvez supprimer que vos propres produits')
        }

        return prisma.product.delete({ where: { id: productId } })
      },
      {
        minRoleLevel: 3,
        requiredPermissions: ['product:delete'],
        auditLog: true,
      }
    )
  },

  async listAll() {
    return withSecurePrisma(
      async (prisma) => {
        return prisma.product.findMany()
      },
      {
        minRoleLevel: 1, // Tous les utilisateurs authentifiés
        auditLog: false,
      }
    )
  }
}
