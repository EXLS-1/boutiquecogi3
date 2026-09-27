// lib/validators/product.schema.ts
// Product Schema Validators - Zod schemas for product validation (merged)

import { z } from "zod";
import { Currency } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES DE PRODUIT
// ═══════════════════════════════════════════════════════════════════════════

export const ProductTypeSchema = z.enum([
  "PHYSICAL",
  "DIGITAL",
  "SERVICE",
  "SUBSCRIPTION",
]);

export type ProductType = z.infer<typeof ProductTypeSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// STATUTS DE PRODUIT
// ═══════════════════════════════════════════════════════════════════════════

export const ProductStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
  "PENDING_REVIEW",
]);

export type ProductStatus = z.infer<typeof ProductStatusSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// PRIX — ProductPrice
// ═══════════════════════════════════════════════════════════════════════════
// Toute notion de prix (produit, variante, filtre) passe par ces schémas.

export const priceSchema = z
  .number({ invalid_type_error: "Le prix doit être un nombre" })
  .positive("Le prix doit être positif")
  .max(999_999_999, "Le prix ne peut pas dépasser 999 999 999");

/** Devises supportées pour un ProductPrice. */
export const PriceCurrencySchema = z.enum([Currency.USD, Currency.CDF]);

export type PriceCurrency = z.infer<typeof PriceCurrencySchema>;

/**
 * ProductPrice — objet de prix canonique.
 * Utilisé pour le prix de base du produit, celui des variantes et les filtres.
 */
export const ProductPriceSchema = z.object({
  basePrice: priceSchema,
  currency: PriceCurrencySchema.default(Currency.CDF),
  compareAtPrice: priceSchema.optional(),
  costPrice: priceSchema.optional(),
});

export type ProductPrice = z.infer<typeof ProductPriceSchema>;

/** Version partielle (override) pour les variantes. */
export const ProductPriceOverrideSchema = ProductPriceSchema.partial();

export type ProductPriceOverride = z.infer<typeof ProductPriceOverrideSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════════════════════════════

export const ProductImageSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url("L'URL de l'image est invalide"),
  alt: z.string().max(255).optional(),
  position: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
});

export type ProductImage = z.infer<typeof ProductImageSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// VARIANTES
// ═══════════════════════════════════════════════════════════════════════════

export const ProductVariantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1, "Le SKU est requis").max(100),
  name: z.string().min(1).max(200).optional(),
  /** Prix propre à la variante (override de celui du produit). */
  price: ProductPriceOverrideSchema.optional(),
  weight: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  depth: z.number().min(0).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// CRÉATION DE PRODUIT
// ═══════════════════════════════════════════════════════════════════════════

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

  // ─── Prix (ProductPrice) ───────────────────────────────────────────────
  price: ProductPriceSchema,

  // ─── Classification ────────────────────────────────────────────────────
  productTypeId: z.string().uuid().optional(),
  // La première catégorie est considérée comme principale.
  categoryIds: z
    .array(z.string().uuid())
    .min(1, "Au moins une catégorie est requise")
    .max(10, "Maximum 10 catégories"),

  status: ProductStatusSchema.default("DRAFT"),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),

  // ─── Dimensions & logistique ───────────────────────────────────────────
  weight: z.number().min(0).optional(),
  dimensions: z
    .object({
      height: z.number().min(0).optional(),
      width: z.number().min(0).optional(),
      depth: z.number().min(0).optional(),
    })
    .optional(),

  // ─── Contenu ───────────────────────────────────────────────────────────
  tags: z.array(z.string().max(50)).max(20).optional(),
  images: z.array(ProductImageSchema).max(20).optional().default([]),
  variants: z.array(ProductVariantSchema).max(100).optional().default([]),

  // ─── Stock ─────────────────────────────────────────────────────────────
  stock: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// MISE À JOUR DE PRODUIT
// ═══════════════════════════════════════════════════════════════════════════

export const updateProductSchema = createProductSchema.partial().extend({
  categoryIds: z
    .array(z.string().uuid())
    .max(10, "Maximum 10 catégories")
    .optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// REQUÊTE DE LISTE
// ═══════════════════════════════════════════════════════════════════════════

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  status: ProductStatusSchema.optional(),
  featured: z.boolean().optional(),
  search: z.string().max(200).optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  sortBy: z
    .enum(["createdAt", "name", "basePrice", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  productTypeId: z.string().uuid().optional(),
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// FILTRAGE AVANCÉ
// ═══════════════════════════════════════════════════════════════════════════

export const productFilterSchema = z.object({
  categories: z.array(z.string().uuid()).optional(),
  productTypes: z.array(z.string().uuid()).optional(),
  inStock: z.boolean().optional(),
  outOfStock: z.boolean().optional(),
  onSale: z.boolean().optional(),
  minPrice: priceSchema.optional(),
  maxPrice: priceSchema.optional(),
  currency: PriceCurrencySchema.optional(),
  tags: z.array(z.string()).optional(),
});

export type ProductFilter = z.infer<typeof productFilterSchema>;
