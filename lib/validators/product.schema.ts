// lib/validators/product.schema.ts
// Product Schema Validators - Zod schemas for product validation

import { z } from "zod";
import { Currency } from "@prisma/client";

// ─── Types de produit ───────────────────────────────────────────────────────

export const ProductTypeSchema = z.enum([
  "PHYSICAL",
  "DIGITAL",
  "SERVICE",
  "SUBSCRIPTION",
]);

export type ProductType = z.infer<typeof ProductTypeSchema>;

// ─── Statuts de produit ─────────────────────────────────────────────────────

export const ProductStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "PENDING_REVIEW",
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;

// ─── Schéma de création de produit ──────────────────────────────────────────

export const createProductSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom doit contenir au moins 2 caractères")
    .max(200, "Le nom ne peut pas dépasser 200 caractères"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Le slug doit être en minuscules avec des tirets")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  basePrice: z
    .number({ invalid_type_error: "Le prix doit être un nombre" })
    .positive("Le prix doit être positif"),
  currency: z
    .enum([Currency.USD, Currency.CDF])
    .default(Currency.CDF),
  productTypeId: z.string().uuid().optional(),
  categoryIds: z
    .array(z.string().uuid())
    .min(1, "Au moins une catégorie est requise")
    .max(10, "Maximum 10 catégories"),
  status: ProductStatusSchema.default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  weight: z.number().min(0).optional(),
  dimensions: z
    .object({
      height: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      depth: z.number().min(0).optional(),
    })
    .optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  images: z.array(z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    alt: z.string().max(255).optional(),
    position: z.number().int().min(0).default(0),
    isPrimary: z.boolean().default(false),
  })).max(20).optional().default([]),
  variants: z.array(z.object({
    id: z.string().uuid(),
    sku: z.string().min(1).max(100),
    name: z.string().min(1).max(200).optional(),
    priceOffset: z.number().optional().default(0),
    additionalPrice: z.number().optional().default(0),
    weight: z.number().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    depth: z.number().optional(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })).max(100).optional().default([]),
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ─── Schéma de mise à jour de produit ───────────────────────────────────────

export const updateProductSchema = createProductSchema.partial().extend({
  categoryIds: z
    .array(z.string().uuid())
    .max(10, "Maximum 10 catégories")
    .optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ─── Schéma de requête de liste ─────────────────────────────────────────────

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  status: ProductStatusSchema.optional(),
  featured: z.boolean().optional(),
  search: z.string().max(200).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  sortBy: z.enum(["createdAt", "name", "basePrice", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  productTypeId: z.string().uuid().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

// ─── Schéma de filtrage avancé ──────────────────────────────────────────────

export const productFilterSchema = z.object({
  categories: z.array(z.string().uuid()).optional(),
  productTypes: z.array(z.string().uuid()).optional(),
  inStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  onSale: z.boolean().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;

// ─── Schéma de validation de prix ───────────────────────────────────────────

export const priceSchema = z
  .number()
  .positive("Le prix doit être positif")
  .max(999999999, "Le prix ne peut pas dépasser 999 999 999");

export const priceInputSchema = z.object({
  basePrice: priceSchema,
  currency: z.enum([Currency.USD, Currency.CDF]).default(Currency.CDF),
  compareAtPrice: priceSchema.optional(),
});

export type PriceInput = z.infer<typeof priceInputSchema>;
