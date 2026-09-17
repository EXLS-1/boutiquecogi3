// server/services/product-category-sync.ts
// =============================================================================
// SYNC CATÉGORIES PRODUIT — validation d'existence + synchronisation atomique
// =============================================================================
// Le schéma supporte DEUX mécanismes :
//   - Product.categoryId  : catégorie principale (1 seule, rétrocompatibilité)
//   - CategoryProduct     : table de jointure (multi-catégories)
// Invariant garanti partout : categoryId === categoryIds[0] (ou null) et
// CategoryProduct reflète EXACTEMENT la liste fournie (remplacement complet).

import type { Prisma, Category } from '@prisma/client'
import { z } from 'zod'
import { ProductServiceError } from './product-service-error'

export const MAX_CATEGORIES_PER_PRODUCT = 10

type PrismaClientLike = Pick<Prisma.TransactionClient, 'category'>
type TxLike = Pick<Prisma.TransactionClient, 'category' | 'categoryProduct' | 'product'>

/** Concatène categoryId + categoryIds en une liste unique et dédupliquée. */
export function normalizeCategoryIds(
  categoryId?: string | null,
  categoryIds?: Array<string | null | undefined> | null,
): string[] {
  if ((categoryId != null && typeof categoryId !== 'string') ||
      (categoryIds != null && (!Array.isArray(categoryIds) ||
        categoryIds.some(id => id != null && typeof id !== 'string')))) {
    throw new ProductServiceError('Catégories invalides.', 'VALIDATION_ERROR')
  }
  const all = [categoryId ?? undefined, ...(categoryIds ?? [])]
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    .map(id => id.trim().toLowerCase())
  const ids = [...new Set(all)]
  if (!z.array(z.string().uuid()).max(MAX_CATEGORIES_PER_PRODUCT).safeParse(ids).success) {
    throw new ProductServiceError('Catégories invalides (UUID, maximum 10).', 'VALIDATION_ERROR')
  }
  return ids
}

/**
 * Vérifie que TOUTES les catégories existent en base.
 * @throws ProductServiceError('CATEGORY_NOT_FOUND') si une catégorie est inconnue.
 */
export async function validateCategoriesExist(
  client: PrismaClientLike,
  ids: string[],
): Promise<Category[]> {
  const normalized = normalizeCategoryIds(undefined, ids)
  if (normalized.length === 0) return []
  const found = await client.category.findMany({
    where: { id: { in: normalized }, deletedAt: null },
  })
  const byId = new Map(found.filter(c => c.deletedAt === null).map(c => [c.id, c]))
  return normalized.map(id => {
    const category = byId.get(id)
    if (!category) {
      throw new ProductServiceError('Catégorie introuvable ou supprimée.', 'CATEGORY_NOT_FOUND')
    }
    return category
  })
}

/**
 * Remplace intégralement les catégories d'un produit (à appeler DANS une transaction) :
 *   1. Suppression des anciennes lignes CategoryProduct
 *   2. Création des nouvelles (displayOrder = position)
 *   3. categoryId = première catégorie (ou null)
 */
export async function syncProductCategories(
  tx: TxLike,
  productId: string,
  categoryIds: string[],
): Promise<void> {
  categoryIds = normalizeCategoryIds(undefined, categoryIds)
  await validateCategoriesExist(tx, categoryIds)
  await tx.categoryProduct.deleteMany({ where: { productId } })

  if (categoryIds.length > 0) {
    await tx.categoryProduct.createMany({
      data: categoryIds.map((categoryId, index) => ({
        productId,
        categoryId,
        displayOrder: index,
      })),
    })
  }

  await tx.product.update({
    where: { id: productId },
    data: { categoryId: categoryIds[0] ?? null },
  })
}