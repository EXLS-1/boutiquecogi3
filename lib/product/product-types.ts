// lib/product/product-types.ts
// =============================================================================
// CONTRATS DE TYPES DU DOMAINE PRODUIT & PRODUCT TYPE CONFIG
// =============================================================================
// Note d'architecture : Ce fichier contient EXCLUSIVEMENT des définitions de
// types et d'interfaces stricts (aucun code exécutable, aucun appel Prisma).
// Il peut être importé en toute sécurité dans des composants Client ou Serveur.

import type {
  Product,
  ProductVariant,
  ProductStatus,
  VariantStatus,
  ProductTypeConfig,
} from "@prisma/client";
import type { Role, PermissionCode } from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// 1. DTOs & ENTITÉS PRISMA ÉTENDUES
// ───────────────────────────────────────────

/** Produit incluant ses variantes rattachées. */
export type ProductWithVariants = Product & {
  variants: ProductVariant[];
};

/** Relation de catégorie simplifiée. */
export type ProductCategoryRelation = {
  id: string;
  name: string;
  slug?: string;
};

/** Produit avec sa catégorie optionnelle. */
export type ProductWithCategory = Product & {
  category?: ProductCategoryRelation | null;
};

/** Agrégat produit complet (Catégorie + Variantes). */
export type ProductAggregate = Product & {
  category?: ProductCategoryRelation | null;
  variants: ProductVariant[];
};

/**
 * DTO d'affichage UI léger (Évite les collisions avec l'entité Prisma Product).
 */
export interface ProductSummaryDTO {
  id: string;
  name: string;
  description: string;
  priceUSD: number;
  stock: number;
  image: string;
  mediaUrls: string[];
  category: string;
}

// ───────────────────────────────────────────
// 2. FILTRES, PAGINATION ET RÉPONSES
// ───────────────────────────────────────────

export interface ProductFilters {
  status?: ProductStatus;
  categoryId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  items: ProductWithCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VariantFilters {
  productId: string;
  status?: VariantStatus;
  search?: string;
}

// ───────────────────────────────────────────
// 3. MUTATIONS & DONNÉES DE FORMULAIRES
// ───────────────────────────────────────────

export type ProductFormData = {
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  categoryId?: string | null;
  images: string[];
  status: ProductStatus;
  productType?: string;
};

export type VariantFormData = {
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string | number | boolean>;
  images: string[];
  status: VariantStatus;
};

// ───────────────────────────────────────────
// 4. AUTORISATION & POLICIES (PRODUCT TYPE CONFIG)
// ───────────────────────────────────────────

export type ProductTypeOperation = "create" | "edit" | "delete";

export interface ProductTypeActor {
  userId: string;
  role: Role;
  roleLevel: number;
  permissions: Set<PermissionCode>;
}

export interface ProductTypeDecision {
  allowed: boolean;
  reasons: string[];
  config: ProductTypeConfig;
}

export interface VariantLimitCheckResult {
  ok: boolean;
  reason: string | null;
}
