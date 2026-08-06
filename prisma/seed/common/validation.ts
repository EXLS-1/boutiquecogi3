// prisma/seed/common/validation.ts
// ============================================
// SCHÉMAS ZOD DE VALIDATION DES DONNÉES JSON
// ============================================
// Les fixtures JSON sont validées à l'import pour détecter tôt les erreurs
// de structure (typo, champs manquants) avant injection en base.

import { z } from "zod";

export const CountrySchema = z.object({
  code: z.string().length(2),
  name: z.string(),
  currency: z.enum(["USD", "CDF"]),
});

export type CountrySeed = z.infer<typeof CountrySchema>;

export const ProvinceSchema = z.object({
  code: z.string(),
  name: z.string(),
  cities: z.array(z.string()),
});

export type ProvinceSeed = z.infer<typeof ProvinceSchema>;

export const CurrencySchema = z.object({
  code: z.enum(["USD", "CDF"]),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(2),
  rateToUsd: z.number().positive(),
});

export type CurrencySeed = z.infer<typeof CurrencySchema>;

export const CarrierSchema = z.object({
  code: z.string(),
  name: z.string(),
  contact: z.string().optional(),
  isActive: z.boolean(),
});

export type CarrierSeed = z.infer<typeof CarrierSchema>;

export const BaseCategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type BaseCategorySeed = z.infer<typeof BaseCategorySchema>;

export const EmailTemplateSchema = z.object({
  key: z.string(),
  subject: z.string(),
  body: z.string(),
});

export type EmailTemplateSeed = z.infer<typeof EmailTemplateSchema>;

/** Valide un tableau de fixtures d'un type donné. */
export function validateFixtures<T>(schema: z.ZodType<T>, data: unknown, label: string): T[] {
  const result = z.array(schema).safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`[seed:validation] Fixtures invalides pour ${label}: ${issues}`);
  }
  return result.data;
}
