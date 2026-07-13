// server/actions/product-actions.ts

'use server'

import { ProductService } from '@/server/services/product-service'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'

type ActionResult<T = unknown> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

export async function createProductAction(formData: FormData): Promise<ActionResult> {
    try {
        const raw = Object.fromEntries(formData)
        const parsed = createProductSchema.safeParse({
            name: raw.name,
            price: Number(raw.price),
            description: raw.description || undefined,
            categoryId: raw.categoryId || undefined,
            images: raw.images ? JSON.parse(raw.images as string) : [],
            stock: raw.stock ? Number(raw.stock) : 0,
        })

        if (!parsed.success) {
            return {
                success: false,
                error: 'Données invalides',
                code: 'VALIDATION_ERROR',
                fieldErrors: parsed.error.flatten().fieldErrors,
            }
        }

        const product = await ProductService.create(parsed.data)
        revalidatePath('/products')
        revalidatePath('/admin/products')

        return {
            success: true,
            data: product,
            message: `Produit "${product.name}" créé avec succès`,
        }
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return { success: false, error: error.message, code: error.code }
        }
        if (error instanceof Error) {
            return { success: false, error: error.message, code: 'SERVICE_ERROR' }
        }
        return { success: false, error: 'Erreur serveur inattendue', code: 'INTERNAL_ERROR' }
    }
}

export async function updateProductAction(
    productId: string,
    formData: FormData
): Promise<ActionResult> {
    try {
        const raw = Object.fromEntries(formData)
        const data: Record<string, unknown> = {}
        if (raw.name) data.name = raw.name
        if (raw.price) data.price = Number(raw.price)
        if (raw.description) data.description = raw.description
        if (raw.categoryId) data.categoryId = raw.categoryId
        if (raw.images) data.images = JSON.parse(raw.images as string)
        if (raw.stock) data.stock = Number(raw.stock)

        const product = await ProductService.update(productId, data)
        revalidatePath('/products')
        revalidatePath(`/products/${productId}`)

        return {
            success: true,
            data: product,
            message: 'Produit mis à jour',
        }
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return { success: false, error: error.message, code: error.code }
        }
        if (error instanceof Error) {
            return { success: false, error: error.message, code: 'SERVICE_ERROR' }
        }
        return { success: false, error: 'Erreur serveur inattendue', code: 'INTERNAL_ERROR' }
    }
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
    try {
        await ProductService.delete(productId)
        revalidatePath('/products')
        revalidatePath('/admin/products')

        return { success: true, data: { deleted: true }, message: 'Produit supprimé' }
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return { success: false, error: error.message, code: error.code }
        }
        if (error instanceof Error) {
            return { success: false, error: error.message, code: 'SERVICE_ERROR' }
        }
        return { success: false, error: 'Erreur serveur inattendue', code: 'INTERNAL_ERROR' }
    }
}

export async function listProductsAction(): Promise<ActionResult> {
    try {
        const products = await ProductService.listAll()
        return { success: true, data: products }
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return { success: false, error: error.message, code: error.code }
        }
        return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
    }
}
