// lib/product/product-types.ts

import type { ProductStatus, Currency, Role } from "@prisma/client";
import type { PermissionCode } from "@/lib/auth/rbac";

export type DynamicAttributeValue = string | number | boolean;
export type DynamicAttributes = Record<string, DynamicAttributeValue>;

export interface VariantInputDto {
  sku?: string;
  attributes: DynamicAttributes;
  priceOffset?: number;
  initialStock: number;
}

export interface PriceInput {
  currency: Currency;
  amount: number;
  compareAtPrice?: number | null;
  country?: string | null;
  region?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export interface CreateProductDto {
  name: string;
  description?: string | null;
  sku?: string;
  slug?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  productTypeId?: string;
  basePrice: number;
  currency?: Currency;
  compareAtPrice?: number | null;
  attributes?: DynamicAttributes;
  variants?: VariantInputDto[];
  images?: string[];
  prices?: PriceInput[];
  tagIds?: string[];
  isFeatured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface ProductQuery {
  search?: string;
  status?: ProductStatus[];
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
  cursor?: string;
  limit?: number;
  orderBy?: "createdAt" | "name" | "updatedAt";
  orderDir?: "asc" | "desc";
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  productType: string | null;
  basePriceCents: number;
  comparePriceCents: number | null;
  currency: Currency;
  status: ProductStatus;
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

export interface ProductActor {
  userId: string;
  role: Role;
  roleLevel: number;
  permissions: Set<PermissionCode>;
}

/** Opérations couvertes par la policy des types de produit. */
export type ProductTypeOperation = "create" | "edit" | "delete";

/** Acteur évalué par la policy des types de produit. */
export interface ProductTypeActor {
  userId?: string;
  role: Role | string;
  roleLevel: number;
  permissions?: Set<PermissionCode> | ReadonlySet<PermissionCode>;
}

/** Décision binaire + motifs explicites + config ayant servi à décider. */
export interface ProductTypeDecision {
  allowed: boolean;
  reasons: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;
}

/** Résultat du contrôle de plafond de variantes. */
export interface VariantLimitCheckResult {
  ok: boolean;
  reason: string | null;
}
