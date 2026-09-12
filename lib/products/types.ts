// lib/products/types.ts
// =============================================================================
// TYPES DTO — Ajout dynamique de produits au stock
// =============================================================================
// Payload « minimaliste » → « ultra-complet » :
//   - { name, basePrice }                    → produit simple (variante implicite)
//   - { name, basePrice, description,
//      categoryId, attributes, variants[] }  → matrice taille/couleur/...
// Le stock est TOUJOURS créé (jamais de produit statique sans inventaire).

import type { Currency } from "@prisma/client";

export type DynamicAttributeValue = string | number | boolean;
export type DynamicAttributes = Record<string, DynamicAttributeValue>;

/** Variante de produit (déclinaison taille/couleur/…). */
export interface VariantInputDto {
  /** SKU optionnel — généré automatiquement côté serveur si absent. */
  sku?: string;
  /** Attributs distinctifs : { taille: "XL", couleur: "Rouge" }. */
  attributes: DynamicAttributes;
  /** Écart de prix en centimes par rapport au prix de base (ex: +500 = +5,00). */
  priceOffset?: number;
  /** Stock initial attribué à cette variante. */
  initialStock: number;
}

/** Produit dynamique : tous les critères sont facultatifs sauf name + basePrice. */
export interface CreateProductDto {
  name: string;
  description?: string | null;
  categoryId?: string | null;
  /** Multi-catégories (table CategoryProduct). La première est la principale. */
  categoryIds?: string[] | null;
  basePrice: number;
  currency?: Currency;
  /** Prix comparative (barré) en centimes — persisté dans ProductPrice. */
  compareAtPrice?: number | null;
  /** Attributs arbitraires du produit parent (ex: { matiere: "Coton" }). */
  attributes?: DynamicAttributes;
  /** Variantes. Absent ⇒ produit simple : une variante implicite unique est créée. */
  variants?: VariantInputDto[];
  images?: string[];
}

/** Résultat renvoyé par le service de création. */
export interface CreatedProductResult {
  productId: string;
  variantCount: number;
  totalStock: number;
  slug: string;
}

/** Mouvement de stock rattaché à une variante. */
export interface StockMovementInput {
  variantId: string;
  /** > 0 = entrée (restock), < 0 = sortie (vente / ajustement). */
  quantity: number;
  reason: string;
  referenceId?: string | null;
  referenceType?: string | null;
  userId?: string | null;
  notes?: string | null;
}

// ═════════════════════════════════════════════════════════════════════════════
// TYPES ADMIN PORTAL — Formulaires, filtres, résultats
// ═════════════════════════════════════════════════════════════════════════════

export interface PriceInput {
  currency: string;
  amount: number;
  compareAtPrice?: number | null;
  country?: string | null;
  region?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/** Formulaire produit (wizard 7 étapes). */
export interface ProductFormInput {
  name: string;
  description?: string | null;
  slug?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  categoryIds?: string[] | null;
  productTypeId?: string | null;
  basePrice: number;
  currency?: Currency;
  compareAtPrice?: number | null;
  attributes?: DynamicAttributes;
  variants?: VariantInputDto[];
  images?: string[];
  prices?: PriceInput[];
  tagIds?: string[] | null;
  isFeatured?: boolean;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  videoUrl?: string | null;
  salePrice?: number | null;
  saleStart?: Date | null;
  saleEnd?: Date | null;
}

/** Mise à jour produit. */
export interface ProductUpdateInput {
  name?: string;
  description?: string | null;
  sku?: string;
  slug?: string;
  categoryId?: string | null;
  categoryIds?: string[] | null;
  basePrice?: number;
  compareAtPrice?: number | null;
  salePrice?: number | null;
  saleStart?: Date | null;
  saleEnd?: Date | null;
  attributes?: DynamicAttributes;
  isFeatured?: boolean;
  isActive?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  videoUrl?: string | null;
  tagIds?: string[] | null;
  prices?: PriceInput[];
}

/** Filtre pour la liste produits. */
export interface ProductFilter {
  search?: string;
  status?: string[];
  productType?: string;
  categoryId?: string;
  catalogId?: string;
  currency?: Currency;
  stockState?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  featured?: boolean;
  archived?: boolean;
  deleted?: boolean;
  createdBy?: string;
  createdFrom?: Date;
  createdTo?: Date;
  priceMinCents?: number;
  priceMaxCents?: number;
  tagIds?: string[];
}

/** Pagination cursor-based. */
export interface ProductPagination {
  cursor?: string;
  limit?: number;
  orderBy?: "createdAt" | "basePrice" | "name" | "updatedAt";
  orderDir?: "asc" | "desc";
}

/** Ligne de liste. */
export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  productType: string | null;
  basePriceCents: number;
  comparePriceCents: number | null;
  currency: Currency;
  status: string;
  isFeatured: boolean;
  isArchived: boolean;
  isActive: boolean;
  imageCount: number;
  variantCount: number;
  quantity: number;
  reserved: number;
  available: number;
  isAvailableProjection: boolean;
  categoryId: string | null;
  categoryName: string | null;
  catalogCount: number;
  tagCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Résultat de liste paginée. */
export interface ProductListResult {
  items: ProductListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
  total: number;
}

export interface ProductKpis {
  total: number;
  published: number;
  drafts: number;
  pending: number;
  scheduled: number;
  archived: number;
  deleted: number;
  outOfStock: number;
  lowStock: number;
}

export interface ProductMutationResult {
  success: boolean;
  productId?: string;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}