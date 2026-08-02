// lib/products/validationService.ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AttributeTemplate } from "./types";

export class ProductValidationService {
  /**
   * Génère un schéma Zod dynamique basé sur le template de la catégorie.
   */
  static async buildSchema(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { attributeTemplate: true },
    });

    if (!category) throw new Error("Category not found");

    const template = category.attributeTemplate as AttributeTemplate;

    // Schéma de base (toujours identique)
    const baseSchema = z.object({
      name: z.string().min(1).max(255),
      slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      basePrice: z.number().positive(),
      compareAtPrice: z.number().positive().optional(),
      categoryId: z.string().uuid(),
      catalogId: z.string().uuid(),
      metadata: z.record(z.unknown()).optional(),
      images: z.array(z.object({
        url: z.string().url(),
        altText: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })).optional(),
    });

    // Schéma dynamique des attributs selon le template
    const attributeShape: Record<string, z.ZodTypeAny> = {};
    
    for (const [key, config] of Object.entries(template)) {
      let fieldSchema: z.ZodTypeAny;

      switch (config.type) {
        case "select":
          fieldSchema = config.options 
            ? z.enum(config.options as [string, ...string[]])
            : z.string();
          break;
        case "multiselect":
          fieldSchema = z.array(z.string());
          break;
        case "string":
        case "rich_text":
          fieldSchema = z.string();
          break;
        case "number":
          fieldSchema = z.number();
          if (config.min !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).min(config.min);
          if (config.max !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).max(config.max);
          break;
        case "boolean":
          fieldSchema = z.boolean();
          break;
        default:
          fieldSchema = z.string();
      }

      if (!config.required) {
        fieldSchema = fieldSchema.optional();
      }

      attributeShape[key] = fieldSchema;
    }

    const attributeSchema = z.object(attributeShape);

    // Schéma des variants (si le template a des attributs isVariant)
    const hasVariantAttributes = Object.values(template).some(c => c.isVariant);

    const variantSchema = z.object({
      attributes: z.record(z.union([z.string(), z.number(), z.boolean()])),
      priceAdjustment: z.number().default(0),
      initialStock: z.number().int().min(0),
      images: z.array(z.string().url()).optional(),
      isDefault: z.boolean().optional(),
    });

    const variantsSchema = hasVariantAttributes
      ? z.array(variantSchema).min(1, "At least one variant is required when category has variant attributes")
      : z.array(variantSchema).optional();

    // Schéma combiné final
    const fullSchema = baseSchema.extend({
      attributes: attributeSchema,
      variants: variantsSchema,
    }).superRefine((data, ctx) => {
      // Validation cross-field : les attributs des variants doivent matcher le template
      if (data.variants && data.variants.length > 0) {
        for (let i = 0; i < data.variants.length; i++) {
          const variant = data.variants[i];
          const variantAttrs = Object.keys(variant.attributes);
          const requiredVariantAttrs = Object.entries(template)
            .filter(([, c]) => c.isVariant && c.required)
            .map(([k]) => k);

          for (const reqAttr of requiredVariantAttrs) {
            if (!variantAttrs.includes(reqAttr)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Variant ${i}: missing required variant attribute '${reqAttr}'`,
                path: ["variants", i, "attributes", reqAttr],
              });
            }
          }
        }
      }

      // Validation : slug unique (on ne peut pas le faire avec Zod seul, c'est du business logic)
    });

    return { fullSchema, template, hasVariantAttributes };
  }

  /**
   * Génère automatiquement toutes les combinaisons de variants possibles
   * à partir des attributs isVariant fournis.
   */
  static generateVariantCombinations(
    template: AttributeTemplate,
    attributes: Record<string, string | number | boolean>
  ): Array<Record<string, string | number | boolean>> {
    const variantAttrs = Object.entries(template)
      .filter(([, config]) => config.isVariant)
      .map(([key]) => key);

    if (variantAttrs.length === 0) return [];

    // Récupérer les valeurs fournies pour chaque attribut variant
    const combinations: Array<Record<string, string | number | boolean>> = [{}];
    
    for (const attrKey of variantAttrs) {
      const value = attributes[attrKey];
      if (!value) continue; // Attribut non fourni, skip

      const values = Array.isArray(value) ? value : [value];
      const newCombinations: typeof combinations = [];

      for (const combo of combinations) {
        for (const val of values) {
          newCombinations.push({ ...combo, [attrKey]: val });
        }
      }
      combinations.length = 0;
      combinations.push(...newCombinations);
    }

    return combinations;
  }
}
