// server/actions/product-actions.ts

'use server'

import { ProductService } from '@/server/services/product-service';
import { createProductSchema } from '@/lib/validations/product.schema';
import { revalidatePath } from 'next/cache';
import { AuthorizationError } from '@/server/core/secure-prisma';
import { generateUUIDv7 } from '@/lib/utils/uuid';
import { generateSlug } from '@/lib/utils/slug';
import { generateSKU } from '@/lib/utils/sku'

/** Coerce a FormData entry to trimmed string (File entries are rejected). */
function formText(value: FormDataEntryValue | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

/** Coerce a FormData entry to a finite number, or undefined when absent/invalid. */
function formNumber(value: FormDataEntryValue | undefined): number | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/** Parse `images` FormData: JSON array of objects, CSV of URLs, or repeated keys. */
function parseImages(formData: FormData): { url: string }[] | undefined {
    const values = formData.getAll('images');
    if (values.length === 0) return undefined;
    const collected: { url: string }[] = [];
    for (const value of values) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('[')) {
            try {
                const parsed: unknown = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        if (typeof item === 'string' && item.trim()) {
                            collected.push({ url: item.trim() });
                        } else if (
                            typeof item === 'object' && item !== null &&
                            typeof (item as { url?: unknown }).url === 'string' &&
                            ((item as { url: string }).url.trim())
                        ) {
                            collected.push({ url: (item as { url: string }).url.trim() });
                        }
                    }
                }
            } catch {
                collected.push({ url: trimmed });
            }
        } else {
            for (const part of trimmed.split(',')) {
                const url = part.trim();
                if (url) collected.push({ url });
            }
        }
    }
    return collected.length > 0 ? collected : undefined;
}

/** Normalize Zod flatten() fieldErrors (values may be undefined in Zod v4). */
function toFieldErrors(
    fieldErrors: Record<string, string[] | undefined>,
): Record<string, string[]> {
    const normalized: Record<string, string[]> = {};
    for (const [key, messages] of Object.entries(fieldErrors)) {
        if (messages && messages.length > 0) normalized[key] = messages;
    }
    return normalized;
}

/**
 * Parse `categoryIds` depuis FormData. Formats tolérés :
 *   - JSON array : '["<uuid>","<uuid>"]'
 *   - CSV        : 'uuid1,uuid2'
 *   - clés répétées : formData.getAll('categoryIds')
 */
function parseCategoryIds(formData: FormData): string[] | undefined {
    const values = formData.getAll('categoryIds').map(String)

    const collected: string[] = []
    for (const value of values) {
        const trimmed = value.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed)) collected.push(...parsed.map(String))
            } catch {
                // JSON invalide → laissé brut, la validation Zod renverra l'erreur
                collected.push(trimmed)
            }
        } else {
            collected.push(...trimmed.split(',').map((s) => s.trim()))
        }
    }

    const unique = [...new Set(collected.filter(Boolean))]
    return unique.length > 0 ? unique : undefined
};

type ActionResult<T = unknown> =
    | { success: true; data: T; message?: string }
    | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> }

// ─── Créer un produit ───

export async function createProductAction(formData: FormData): Promise<ActionResult> {
    try {
        // Validation Zod — le schéma canonique attend un objet `price` imbriqué.
        const basePrice = formNumber(formData.get('price')) ?? formNumber(formData.get('basePrice'));
        const parsed = createProductSchema.safeParse({
            name: formText(formData.get('name')),
            description: formText(formData.get('description')),
            shortDescription: formText(formData.get('shortDescription')),
            price: {
                basePrice,
                currency: formText(formData.get('currency')) ?? 'CDF',
            },
            productTypeId: formText(formData.get('productTypeId')),
            categoryIds: parseCategoryIds(formData) ?? [],
            status: formText(formData.get('status')),
            tags: formData.getAll('tags').filter((t): t is string => typeof t === 'string'),
            images: parseImages(formData) ?? [],
            stock: formNumber(formData.get('stock')) ?? 0,
        })

        if (!parsed.success) {
            return {
                success: false,
                error: 'Données invalides',
                code: 'VALIDATION_ERROR',
                fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors),
            }
        }

        // Mapping vers le schéma Prisma exact
        const productData = {
            id: generateUUIDv7(),
            name: parsed.data.name,
            slug: parsed.data.slug ?? generateSlug(parsed.data.name),
            sku: generateSKU(parsed.data.name),
            description: parsed.data.description,
            shortDescription: parsed.data.shortDescription,
            basePrice: parsed.data.price.basePrice, // ← Prisma attend basePrice
            status: 'PUBLISHED' as const,           // enum ProductStatus (contrat phase 2)
            categoryId: parsed.data.categoryIds?.[0] ?? null,
            categoryIds: parsed.data.categoryIds ?? null,
            images: parsed.data.images?.map((img) => img.url) ?? [],
            stock: parsed.data.stock,
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
        const data: {
            name?: string;
            basePrice?: number;
            description?: string | null;
            categoryId?: string | null;
            categoryIds?: string[] | null;
            images?: string[];
        } = {}

        const name = formText(formData.get('name'));
        if (name !== undefined) data.name = name;
        const basePrice = formNumber(formData.get('price')) ?? formNumber(formData.get('basePrice'));
        if (basePrice !== undefined) data.basePrice = basePrice; // ← mapping price → basePrice
        const description = formText(formData.get('description'));
        if (description !== undefined) data.description = description;
        const categoryId = formText(formData.get('categoryId'));
        if (categoryId !== undefined) data.categoryId = categoryId;
        const categoryIds = parseCategoryIds(formData);
        if (categoryIds !== undefined) data.categoryIds = categoryIds;
        const images = parseImages(formData);
        if (images !== undefined) data.images = images.map((img) => img.url);

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

        // Prisma renvoie des objets Decimal (price, basePrice, salePrice...) qui ne
        // peuvent pas traverser la frontière Server → Client Component.
        // On les convertit en nombres via JSON round-trip (Decimal.toJSON → string).
        const serialized = products
            ? JSON.parse(
                  JSON.stringify(products, (_key, value) =>
                      typeof value === 'bigint' ? value.toString() : value
                  )
              )
            : null

        return { success: true, data: serialized }
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return { success: false, error: error.message, code: error.code }
        }
        return { success: false, error: 'Erreur serveur', code: 'INTERNAL_ERROR' }
    }
}
