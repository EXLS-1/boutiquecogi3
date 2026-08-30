// lib/products/validationService.ts
// =============================================================================
// VALIDATION DYNAMIQUE — produits minimalistes → matrices complètes
// =============================================================================
// Schéma Zod unique, robuste et anti-fragile :
//  - z.coerce.number() tolère les chaînes numériques venant des formulaires ;  - attributs libres (Record) mais sanitizés (type primitif strict) ;
//  - refine cross-champs : variantes sans attributs distinctifs rejetées.
// Aucune dépendance à une table « template de catégorie » : tous les critères
// (category, couleur, taille, description…) sont donc facultatifs par défaut.

import { z } from "zod";

// ─── Constantes (source unique, anti-magic-numbers) ─────────────────────────

export const PRODUCT_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 200,
  DESC_MAX: 5000,
  SKU_MIN: 3,
  SKU_MAX: 64,
  PRICE_MAX: 1_000_000_000,
  PRICE_OFFSET_ABS_MAX: 10_000_000, // 100 000,00 dans l'unité monétaire
  STOCK_MAX: 10_000_000,
  VARIANT_MAX: 100,
  IMAGE_MAX: 20,
  ATTRIBUTE_KEY_MAX: 100,
  ATTRIBUTE_VALUE_MAX: 500,
} as const;

const attributeValueSchema = z.union([
  z.string().trim().max(PRODUCT_LIMITS.ATTRIBUTE_VALUE_MAX),
  z.number().finite().min(-1_000_000_000).max(1_000_000_000),
  z.boolean(),
]);

const variantSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(PRODUCT_LIMITS.SKU_MIN, "Le SKU doit contenir au moins 3 caractères.")
    .max(PRODUCT_LIMITS.SKU_MAX)
    .optional(),
  attributes: z
    .record(z.string().trim().min(1).max(PRODUCT_LIMITS.ATTRIBUTE_KEY_MAX), attributeValueSchema)
    .default({}),
  priceOffset: z.coerce
    .number()
    .int()
    .min(-PRODUCT_LIMITS.PRICE_OFFSET_ABS_MAX)
    .max(PRODUCT_LIMITS.PRICE_OFFSET_ABS_MAX)
    .default(0),
  initialStock: z.coerce.number().int().min(0).max(PRODUCT_LIMITS.STOCK_MAX).default(0),
});

/**
 * Schéma canonique de création dynamique.
 * - Obligatoires : name, basePrice.
 * - Facultatifs  : description, categoryId, currency, attributes, variants, images.
 */
export const dynamicProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(PRODUCT_LIMITS.NAME_MIN, "Le nom doit contenir au moins 2 caractères.")
      .max(PRODUCT_LIMITS.NAME_MAX),
    description: z.string().trim().max(PRODUCT_LIMITS.DESC_MAX).optional().nullable(),
    categoryId: z.string().uuid("categoryId doit être un UUID valide.").optional().nullable(),
    basePrice: z.coerce
      .number()
      .positive("Le prix doit être supérieur à 0.")
      .max(PRODUCT_LIMITS.PRICE_MAX),
    currency: z.enum(["USD", "CDF"]).default("USD"),
    attributes: z
      .record(z.string().trim().min(1).max(PRODUCT_LIMITS.ATTRIBUTE_KEY_MAX), attributeValueSchema)
      .default({}),
    variants: z.array(variantSchema).max(PRODUCT_LIMITS.VARIANT_MAX).optional(),
    images: z.array(z.string().url("Chaque image doit être une URL valide.")).max(PRODUCT_LIMITS.IMAGE_MAX).default([]),
  })
  .superRefine((data, ctx) => {
    const variants = data.variants ?? [];

    // Chaque variante d'une matrice doit porter au moins un attribut distinctif.
    if (variants.length > 1) {
      variants.forEach((variant, index) => {
        if (Object.keys(variant.attributes).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", index, "attributes"],
            message: "Une variante doit avoir au moins un attribut (taille, couleur…).",
          });
        }
      });
    }

    // Unicité des SKU explicites au sein de la payload.
    const seenSkus = new Set<string>();
    for (const variant of variants) {
      if (!variant.sku) continue;
      if (seenSkus.has(variant.sku)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants"],
          message: `SKU en double dans la payload : ${variant.sku}.`,
        });
      }
      seenSkus.add(variant.sku);
    }
  });

export type DynamicProductInput = z.infer<typeof dynamicProductSchema>;

export class ProductValidationService {
  /**
   * Valide une entrée brute et renvoie le DTO normalisé.
   * @throws z.ZodError si la validation échoue.
   */
  static parse(rawInput: unknown): DynamicProductInput {
    return dynamicProductSchema.parse(rawInput);
  }

  /**
   * Normalise la liste des variantes :
   *  - aucun tableau ⇒ variante implicite unique (produit SIMPLE) ;
   *  - tableau non vide ⇒ matrice telle quelle.
   * Garantit qu'il existe TOUJOURS ≥ 1 variante (anti-produit-statique).
   */
  static normalizeVariants(input: DynamicProductInput): Array<{
    sku?: string;
    attributes: Record<string, string | number | boolean>;
    priceOffset: number;
    initialStock: number;
  }> {
    if (Array.isArray(input.variants) && input.variants.length > 0) {
      return input.variants.map((v) => ({
        sku: v.sku?.trim() || undefined,
        attributes: v.attributes,
        priceOffset: v.priceOffset,
        initialStock: v.initialStock,
      }));
    }

    // Produit simple ⇒ variante implicite unique alimentée par les attributs racine.
    return [
      {
        attributes: input.attributes,
        priceOffset: 0,
        initialStock: 0,
      },
    ];
  }

  /** Calcule le stock total initial (somme des variantes). */
  static computeTotalStock(
    variants: Array<{ initialStock: number }>
  ): number {
    return variants.reduce((sum, v) => sum + v.initialStock, 0);
  }
}
