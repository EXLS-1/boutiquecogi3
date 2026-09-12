// lib/products/product.constants.ts
// =============================================================================
// CONSTANTES PRODUIT — Toute valeur magique du domaine
// ═════════════════════════════════════════════════════════════════════════════
// Chargées depuis .env (fallback pour rétrocompatibilité).
//

import { ProductStatus } from "@prisma/client";

export const envInt = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw || raw.trim() === "") return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const PRODUCT_LIMITS = {
  NAME_MIN: envInt("PRODUCT_NAME_MIN", 2),
  NAME_MAX: envInt("PRODUCT_NAME_MAX", 200),
  DESC_MAX: envInt("PRODUCT_DESC_MAX", 5000),
  SKU_MIN: envInt("PRODUCT_SKU_MIN", 3),
  SKU_MAX: envInt("PRODUCT_SKU_MAX", 64),
  PRICE_MAX: envInt("PRODUCT_PRICE_MAX", 1_000_000_000),
  VARIANT_MAX: envInt("PRODUCT_VARIANT_MAX", 100),
  IMAGE_MAX: envInt("PRODUCT_IMAGE_MAX", 20),
  CATEGORY_MAX: 10,
  TAG_MAX: 50,
} as const;

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En révision",
  SCHEDULED: "Programmé",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
  DISCONTINUED: "Arrêté",
};

export const PRODUCT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-100 text-gray-700",
  DISCONTINUED: "bg-red-100 text-red-700",
};

export const PUBLISHABLE_STATUSES: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.PENDING,
  ProductStatus.SCHEDULED,
];

export const STOCK_THRESHOLDS = {
  LOW_STOCK: 10,
  CRITICAL: 5,
  DEFAULT_ALERT: 10,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
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

export const SERVER_ACTION_RESULT = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TRANSACTION_ERROR: "TRANSACTION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
