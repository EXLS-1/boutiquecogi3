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
import { ProductServiceError } from './product-service'

export const MAX_CATEGORIES_PER_PRODUCT = 10

type PrismaClientLike = {
  category: {
    findMany(args: { where: { id: { in: string[] } } }): Promise<Category[]>
  }
}

type TxLike = {
  categoryProduct: {
    deleteMany(args: { where: { productId: string } }): Promise<unknown>
    createMany(args: { data: Array<{ productId: string; categoryId: string; displayOrder: number }> }): Promise<unknown>
  }
  product: {
    update(args: {
      where: { id: string }
      data: { categoryId: string | null }
    }): Promise<unknown>
  }
}

/** Concatène categoryId + categoryIds en une liste unique et dédupliquée. */
export function normalizeCategoryIds(
  categoryId?: string | null,
  categoryIds?: Array<string | null | undefined> | null,
): string[] {
  const all = [categoryId ?? undefined, ...(categoryIds ?? [])]
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
  return [...new Set(all)]
}

/**
 * Vérifie que TOUTES les catégories existent en base.
 * @throws ProductServiceError('CATEGORY_NOT_FOUND') si une catégorie est inconnue.
 */
export async function validateCategoriesExist(
  client: PrismaClientLike,
  ids: string[],
): Promise<Category[]> {
  if (ids.length === 0) return []
  if (ids.length > MAX_CATEGORIES_PER_PRODUCT) {
    throw new ProductServiceError(
      `Trop de catégories (${ids.length}). Maximum : ${MAX_CATEGORIES_PER_PRODUCT}.`,
      'VALIDATION_ERROR',
    )
  }

  const found = await client.category.findMany({ where: { id: { in: ids } } })
  const foundIds = new Set(found.map((c) => c.id))
  const missing = ids.filter((id) => !foundIds.has(id))

  if (missing.length > 0) {
    throw new ProductServiceError(
      `Catégorie(s) introuvable(s) : ${missing.join(', ')}`,
      'CATEGORY_NOT_FOUND',
    )
  }

  return found
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