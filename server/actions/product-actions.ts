// server/actions/product-actions.ts

'use server'

import { ProductService } from '@/server/services/product-service'
import { createProductSchema, updateProductSchema } from '@/lib/validations/product'
import { revalidatePath } from 'next/cache'
import { AuthorizationError } from '@/server/core/secure-prisma'
import { generateUUIDv7 } from '@/lib/uuid'

type ActionResult<T = unknown> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

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

// ─── Créer un produit ───

export async function createProductAction(formData: FormData): Promise<ActionResult> {
    try {
        const raw = Object.fromEntries(formData)

        // Validation Zod (schéma client — peut encore contenir price/stock)
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

        // Mapping vers le schéma Prisma exact
        const productData = {
            id: generateUUIDv7(),
            name: parsed.data.name,
            slug: generateSlug(parsed.data.name),
            sku: generateSKU(parsed.data.name),
            description: parsed.data.description,
            basePrice: parsed.data.price,        // ← Prisma attend basePrice
            status: 'ACTIVE' as const,           // ← enum ProductStatus
            categoryId: parsed.data.categoryId,
            images: parsed.data.images,
            // stock ignoré : n'existe pas dans schema.prisma
        }

        const product = await ProductService.create(productData)
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

// ─── Mettre à jour un produit ───

export async function updateProductAction(
    productId: string,
    formData: FormData
): Promise<ActionResult> {
    try {
        const raw = Object.fromEntries(formData)
        const data: Record<string, unknown> = {}

        if (raw.name) data.name = raw.name
        if (raw.price) data.basePrice = Number(raw.price) // ← mapping price → basePrice
        if (raw.description) data.description = raw.description
        if (raw.categoryId) data.categoryId = raw.categoryId
        if (raw.images) data.images = JSON.parse(raw.images as string)
        // stock ignoré : n'existe pas dans schema.prisma

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

// ─── Supprimer un produit ───

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

// ─── Lister les produits ───

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
