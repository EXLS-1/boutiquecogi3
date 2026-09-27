// lib/product/product-constant.ts
// =============================================================================
// DOMAIN CONSTANTS: PRODUCT & VARIANT
// =============================================================================

import { ProductStatus } from "@prisma/client";

// ───────────────────────────────────────────
// UTILITIES
// ───────────────────────────────────────────

/**
 * Extrait et valide une variable d'environnement entière.
 * Retourne la valeur par défaut si la clé est absente, invalide ou négative.
 */
export const envInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = parseInt(raw.trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// ───────────────────────────────────────────
// STATUTS ET MAPPINGS
// ───────────────────────────────────────────

/**
 * Représentation runtime de l'enum Prisma ProductStatus.
 */
export const PRODUCT_STATUS = {
  DRAFT: ProductStatus.DRAFT,
  PENDING: ProductStatus.PENDING,
  SCHEDULED: ProductStatus.SCHEDULED,
  PUBLISHED: ProductStatus.PUBLISHED,
  ARCHIVED: ProductStatus.ARCHIVED,
  DISCONTINUED: ProductStatus.DISCONTINUED,
} as const;

export const VARIANT_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type VariantStatus =
  (typeof VARIANT_STATUS)[keyof typeof VARIANT_STATUS];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: "Brouillon",
  [ProductStatus.PENDING]: "En révision",
  [ProductStatus.SCHEDULED]: "Programmé",
  [ProductStatus.PUBLISHED]: "Publié",
  [ProductStatus.ARCHIVED]: "Archivé",
  [ProductStatus.DISCONTINUED]: "Arrêté",
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  [ProductStatus.DRAFT]: "bg-slate-100 text-slate-700",
  [ProductStatus.PENDING]: "bg-amber-100 text-amber-700",
  [ProductStatus.SCHEDULED]: "bg-blue-100 text-blue-700",
  [ProductStatus.PUBLISHED]: "bg-green-100 text-green-700",
  [ProductStatus.ARCHIVED]: "bg-gray-100 text-gray-700",
  [ProductStatus.DISCONTINUED]: "bg-red-100 text-red-700",
};

export const VARIANT_STATUS_LABELS: Record<VariantStatus, string> = {
  [VARIANT_STATUS.ACTIVE]: "Actif",
  [VARIANT_STATUS.INACTIVE]: "Inactif",
};

// ───────────────────────────────────────────
// LIMITES ET CONTRAINTES DU DOMAINE
// ───────────────────────────────────────────

export const PRODUCT_LIMITS = {
  NAME_MIN: envInt("PRODUCT_NAME_MIN", 2),
  NAME_MAX: envInt("PRODUCT_NAME_MAX", 200),
  DESC_MAX: envInt("PRODUCT_DESC_MAX", 5000),
  SKU_MIN: envInt("PRODUCT_SKU_MIN", 3),
  SKU_MAX: envInt("PRODUCT_SKU_MAX", 64),
  PRICE_MAX: envInt("PRODUCT_PRICE_MAX", 1_000_000_000),
  VARIANT_MAX: envInt("PRODUCT_VARIANT_MAX", 100),
  IMAGE_MAX: envInt("PRODUCT_IMAGE_MAX", 20),
  MAX_IMAGES_PER_PRODUCT: envInt("PRODUCT_IMAGE_MAX", 10),
  MAX_IMAGES_PER_VARIANT: 5,
  CATEGORY_MAX: 10,
  TAG_MAX: 50,
  MAX_ADJUSTMENT: 10000,
} as const;

// Exports directs (rétrocompatibilité)
export const MAX_IMAGES_PER_PRODUCT = PRODUCT_LIMITS.MAX_IMAGES_PER_PRODUCT;
export const MAX_IMAGES_PER_VARIANT = PRODUCT_LIMITS.MAX_IMAGES_PER_VARIANT;

// ───────────────────────────────────────────
// VALEURS PAR DÉFAUT & PAGINATION
// ───────────────────────────────────────────

export const PRODUCT_DEFAULTS = {
  DEFAULT_CURRENCY: "USD" as const,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

export const DEFAULT_PAGE_SIZE = PRODUCT_DEFAULTS.DEFAULT_PAGE_SIZE;

// ───────────────────────────────────────────
// SEUILS DE STOCK
// ───────────────────────────────────────────

export const STOCK_THRESHOLDS = {
  LOW_STOCK: 10,
  CRITICAL: 5,
  DEFAULT_ALERT: 10,
} as const;

// ───────────────────────────────────────────
// MACHINE À ÉTATS ET TRANSITIONS DE WORKFLOW
// ───────────────────────────────────────────

export const STATUS_TRANSITIONS: Record<
  ProductStatus,
  readonly ProductStatus[]
> = {
  [ProductStatus.DRAFT]: [ProductStatus.PENDING, ProductStatus.SCHEDULED],
  [ProductStatus.PENDING]: [ProductStatus.DRAFT, ProductStatus.PUBLISHED],
  [ProductStatus.SCHEDULED]: [ProductStatus.PUBLISHED],
  [ProductStatus.PUBLISHED]: [
    ProductStatus.ARCHIVED,
    ProductStatus.DISCONTINUED,
  ],
  [ProductStatus.ARCHIVED]: [ProductStatus.DRAFT],
  [ProductStatus.DISCONTINUED]: [],
} as const;

export const CAN_BE_PUBLISHED_FROM: readonly ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.PENDING,
  ProductStatus.SCHEDULED,
] as const;

// Alias de rétrocompatibilité
export const PUBLISHABLE_STATUSES = CAN_BE_PUBLISHED_FROM;

export const CAN_RETURN_TO_DRAFT_FROM: readonly ProductStatus[] = [
  ProductStatus.PENDING,
  ProductStatus.ARCHIVED,
] as const;

export type PublishAction =
  | "submit"
  | "approve"
  | "reject"
  | "schedule"
  | "publish"
  | "archive"
  | "discontinue"
  | "restore";

/**
 * Détermine l'action métier correspondant à une transition d'état.
 * Retourne `null` si la transition n'est pas autorisée.
 */
export function getPublishAction(
  from: ProductStatus,
  to: ProductStatus
): PublishAction | null {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) return null;

  if (from === ProductStatus.DRAFT && to === ProductStatus.PENDING)
    return "submit";
  if (from === ProductStatus.DRAFT && to === ProductStatus.SCHEDULED)
    return "schedule";
  if (from === ProductStatus.PENDING && to === ProductStatus.PUBLISHED)
    return "approve";
  if (from === ProductStatus.PENDING && to === ProductStatus.DRAFT)
    return "reject";
  if (from === ProductStatus.SCHEDULED && to === ProductStatus.PUBLISHED)
    return "publish";
  if (from === ProductStatus.PUBLISHED && to === ProductStatus.ARCHIVED)
    return "archive";
  if (from === ProductStatus.PUBLISHED && to === ProductStatus.DISCONTINUED)
    return "discontinue";
  if (from === ProductStatus.ARCHIVED && to === ProductStatus.DRAFT)
    return "restore";

  return null;
}

// ───────────────────────────────────────────
// ROUTAGE & CACHE
// ───────────────────────────────────────────

export const PRODUCT_ROUTES = {
  LIST: "/admin/products",
  CREATE: "/admin/products/new",
  EDIT: (id: string) => `/admin/products/${id}/edit`,
  DETAIL: (id: string) => `/admin/products/${id}`,
  VARIANTS: (id: string) => `/admin/products/${id}/variants`,
} as const;

export const PRODUCT_CACHE = {
  TAGS: {
    LIST: "admin:products:list",
    DETAIL: (id: string) => `admin:product:${id}`,
    KPIS: "admin:products:kpis",
    SEARCH: "admin:products:search",
  },
  TTL: {
    LIST: 60,
    DETAIL: 300,
    KPIS: 30,
    SEARCH: 15,
  },
} as const;

// ───────────────────────────────────────────
// CODES DE RÉSULTAT DES SERVER ACTIONS
// ───────────────────────────────────────────

export const SERVER_ACTION_RESULT = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TRANSACTION_ERROR: "TRANSACTION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ServerActionResultCode =
  (typeof SERVER_ACTION_RESULT)[keyof typeof SERVER_ACTION_RESULT];