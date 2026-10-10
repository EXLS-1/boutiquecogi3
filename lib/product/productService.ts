// lib/product/productService.ts
// =============================================================================
// COMPAT SHIM — conserve l'import historique `@/lib/product/productService`
// utilisé par `server/actions/product-dynamic-actions.ts`.
// Délègue à l'implémentation canonique `lib/product/product-service.ts`
// (classe statique `ProductService`) sans dupliquer la logique métier.
// =============================================================================

import { z } from "zod";
import { Currency } from "@prisma/client";
import {
  ProductService as CanonicalProductService,
} from "@/lib/product/product-service";
import { ProductError } from "@/lib/product/product-errors";

export { ProductError };

const dynamicAttributeValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const dynamicVariantSchema = z.object({
  sku: z.string().trim().max(64).optional(),
  attributes: z.record(z.string(), dynamicAttributeValueSchema).optional().default({}),
  priceOffset: z.coerce.number().int().optional().default(0),
  initialStock: z.coerce.number().int().min(0).optional().default(0),
});

const createDynamicProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().max(10000).optional().nullable(),
  slug: z.string().trim().max(220).optional(),
  sku: z.string().trim().max(64).optional(),
  basePrice: z.coerce.number().nonnegative(),
  currency: z.nativeEnum(Currency).optional().default(Currency.CDF),
  categoryId: z.string().uuid().optional().nullable(),
  categoryIds: z.array(z.string().uuid()).max(10).optional().default([]),
  productTypeId: z.string().uuid().optional(),
  attributes: z.record(z.string(), dynamicAttributeValueSchema).optional().default({}),
  variants: z.array(dynamicVariantSchema).max(100).optional().default([]),
  images: z.array(z.string().min(1)).max(20).optional().default([]),
});

export type CreateDynamicProductInput = z.infer<typeof createDynamicProductSchema>;

export interface DynamicProductResult {
  productId: string;
  slug: string;
  variantCount: number;
  totalStock: number;
}

const addStockSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  reason: z.string().max(200).optional().default("RESTOCK"),
  notes: z.string().max(1000).optional(),
});

export type AddStockInput = z.infer<typeof addStockSchema>;

function toFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  const normalized: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) normalized[key] = messages;
  }
  return normalized;
}

function validationError(error: z.ZodError, fallback: string): never {
  const fieldErrors = toFieldErrors(error.flatten().fieldErrors);
  const first = Object.values(fieldErrors).flat()[0] ?? fallback;
  throw new ProductError(first, "VALIDATION_ERROR", 400, { fieldErrors });
}

/**
 * Façade d'instance (l'action historique appelle des méthodes d'instance).
 * Chaque méthode valide son entrée avec Zod puis délègue au service canonique.
 */
class DynamicProductService {
  async createDynamicProduct(
    payload: unknown,
    userId: string
  ): Promise<DynamicProductResult> {
    const parsed = createDynamicProductSchema.safeParse(payload);
    if (!parsed.success) validationError(parsed.error, "Payload produit invalide");

    const input = parsed.data;
    const created = await CanonicalProductService.create(
      {
        name: input.name,
        description: input.description ?? null,
        slug: input.slug,
        sku: input.sku,
        categoryId: input.categoryId ?? null,
        categoryIds: input.categoryIds,
        productTypeId: input.productTypeId,
        basePrice: input.basePrice,
        currency: input.currency,
        attributes: input.attributes,
        variants: input.variants.map((v) => ({
          sku: v.sku,
          attributes: v.attributes,
          priceOffset: v.priceOffset,
          initialStock: v.initialStock,
        })),
        images: input.images,
      },
      userId
    );

    const variants = Array.isArray(
      (created as { variants?: unknown }).variants
    )
      ? ((created as { variants: { initialStock?: unknown }[] }).variants)
      : [];
    const totalStock = variants.reduce(
      (sum, v) =>
        sum + (typeof v.initialStock === "number" && Number.isFinite(v.initialStock) ? v.initialStock : 0),
      0
    );

    return {
      productId: (created as { id: string }).id,
      slug: (created as { slug: string }).slug,
      variantCount: variants.length,
      totalStock,
    };
  }

  async addStock(input: unknown, userId: string) {
    const parsed = addStockSchema.safeParse(input);
    if (!parsed.success) validationError(parsed.error, "Mouvement de stock invalide");
    const { variantId, quantity, reason, notes } = parsed.data;
    const detail = [reason, notes?.trim()].filter(Boolean).join(" — ");
    return CanonicalProductService.adjustVariantStock(
      variantId,
      quantity,
      detail || "RESTOCK",
      userId
    );
  }
}

export const ProductService = new DynamicProductService();
