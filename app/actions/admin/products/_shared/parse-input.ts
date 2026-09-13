// app/actions/admin/products/_shared/parse-input.ts
// ═════════════════════════════════════════════════════════════════════════════
// SHARED — Parse & validate input for product actions
// ═════════════════════════════════════════════════════════════════════════════

import { z } from "zod";

// ───────────────────────────────────────────
// SCHEMA COMMUN — Création produit
// ───────────────────────────────────────────

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).nullable().optional(),
  slug: z.string().min(2).max(64).nullable().optional(),
  sku: z.string().min(3).max(64).nullable().optional(),
  productTypeId: z.string().uuid().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).max(10).nullable().optional(),
  basePrice: z.number().positive().max(1_000_000_000),
  currency: z.enum(["USD", "CDF"]).optional(),
  compareAtPrice: z.number().nullable().optional(),
  variants: z.array(z.object({
    sku: z.string().optional(),
    attributes: z.record(z.string()).optional(),
    priceOffset: z.number().nullable().optional(),
    initialStock: z.number().min(0),
  })).max(100).optional(),
  images: z.array(z.string().url()).max(20).optional(),
  prices: z.array(z.object({
    currency: z.enum(["USD", "CDF"]),
    amount: z.number().positive(),
    compareAtPrice: z.number().nullable().optional(),
    country: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    startsAt: z.date().nullable().optional(),
    endsAt: z.date().nullable().optional(),
  })).optional(),
  tagIds: z.array(z.string().uuid()).max(50).nullable().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  seoTitle: z.string().max(70).nullable().optional(),
  seoDescription: z.string().max(160).nullable().optional(),
});