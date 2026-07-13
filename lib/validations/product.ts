// lib/validations/product.ts

import { z } from 'zod'

export const createProductSchema = z.object({
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(200),
    price: z.number().positive('Le prix doit être positif'),
    description: z.string().max(5000).optional(),
    categoryId: z.uuid().optional(),
    images: z.array(z.url()).optional().default([]),
    stock: z.number().int().min(0).optional().default(0),
})

export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()

export type UpdateProductInput = z.infer<typeof updateProductSchema>