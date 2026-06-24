// lib/validators/product.schema.ts
import { z } from "zod";

/**
 * Schéma Zod de validation produit.
 * Aligné avec CatalogProduct et le schéma Prisma.
 */
export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(5000).nullable(),
  price: z.number().nonnegative().max(100_000_000),
  image: z.string().min(1).default("/placeholder.webp"),
  images: z.array(z.string()).optional(),
  category: z.string().optional(),
  isArchived: z.boolean().optional().default(false),
  // RBAC
  minRbacLevel: z.number().int().min(1).max(7).optional().default(7),
  requiresAuth: z.boolean().optional().default(false),
  // Promotions
  isPromoted: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  discountPercent: z.number().int().min(0).max(100).optional().default(0),
});

export type ProductSchemaType = z.infer<typeof ProductSchema>;