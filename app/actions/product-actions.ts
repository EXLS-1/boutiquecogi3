// app/actions/product-actions.ts

'use server'

import { ProductService } from '@/server/services/product-service'
import { createProductSchema } from '@/lib/validations/product'
import { z } from 'zod'

// ─── Ces fonctions sont les SEULES appelables depuis le client ───

export async function createProductAction(formData: FormData) {
  // Validation Zod
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: 'Données invalides', details: parsed.error.flatten() }
  }

  try {
    const product = await ProductService.create(parsed.data)
    return { success: true, product }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { error: 'Non autorisé', code: 'FORBIDDEN' }
    }
    return { error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
  }
}

export async function deleteProductAction(productId: string) {
  try {
    await ProductService.delete(productId)
    return { success: true }
  } catch (error) {
    // ...
  }
}
