// lib/products/constants.ts
// =============================================================================
// CONSTANTES PRODUIT — Valeurs magiques du domaine Produit
// =============================================================================
// À centraliser ici pour éviter la duplication dans le code.

import { ProductStatus } from "@prisma/client";

// ───────────────────────────────────────────
// LIMITES
// ───────────────────────────────────────────

export const PRODUCT_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 200,
  DESC_MAX: 5000,
  SKU_MIN: 3,
  SKU_MAX: 64,
  PRICE_MAX: 1_000_000_000,
  VARIANT_MAX: 100,
  IMAGE_MAX: 20,
  CATEGORY_MAX: 10,
  TAG_MAX: 50,
  MAX_ADJUSTMENT: 10000,
} as const;

// ───────────────────────────────────────────
// STATUS
// ───────────────────────────────────────────

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  PENDING: "En révision",
  SCHEDULED: "Programmé",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
  DISCONTINUED: "Arrêté",
};

export const PRODUCT_STATUS_COLORS: Record<ProductStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-gray-100 text-gray-700",
  DISCONTINUED: "bg-red-100 text-red-700",
};

// ───────────────────────────────────────────
// STATE MACHINE — TRANSITIONS
// ───────────────────────────────────────────

export const STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  DRAFT: [ProductStatus.PENDING, ProductStatus.SCHEDULED],
  PENDING: [ProductStatus.DRAFT, ProductStatus.PUBLISHED],
  SCHEDULED: [ProductStatus.PUBLISHED],
  PUBLISHED: [ProductStatus.ARCHIVED, ProductStatus.DISCONTINUED],
  ARCHIVED: [ProductStatus.DRAFT],
  DISCONTINUED: [],
};

export const CAN_BE_PUBLISHED_FROM: ProductStatus[] = [
  ProductStatus.DRAFT,
  ProductStatus.PENDING,
  ProductStatus.SCHEDULED,
];

export const CAN_RETURN_TO_DRAFT_FROM: ProductStatus[] = [
  ProductStatus.PENDING,
  ProductStatus.ARCHIVED,
];

// ───────────────────────────────────────────
// PUBLISH ACTIONS
// ───────────────────────────────────────────

export type PublishAction =
  | "submit"
  | "approve"
  | "reject"
  | "schedule"
  | "publish"
  | "archive"
  | "discontinue"
  | "restore";

export function getPublishAction(
  from: ProductStatus,
  to: ProductStatus
): PublishAction | null {
  const transitions = STATUS_TRANSITIONS[from];
  if (!transitions.includes(to)) return null;

  if (from === ProductStatus.DRAFT && to === ProductStatus.PENDING) return "submit";
  if (from === ProductStatus.DRAFT && to === ProductStatus.SCHEDULED) return "schedule";
  if (from === ProductStatus.PENDING && to === ProductStatus.PUBLISHED) return "approve";
  if (from === ProductStatus.PENDING && to === ProductStatus.DRAFT) return "reject";
  if (from === ProductStatus.SCHEDULED && to === ProductStatus.PUBLISHED) return "publish";
  if (from === ProductStatus.PUBLISHED && to === ProductStatus.ARCHIVED) return "archive";
  if (from === ProductStatus.PUBLISHED && to === ProductStatus.DISCONTINUED) return "discontinue";
  if (from === ProductStatus.ARCHIVED && to === ProductStatus.DRAFT) return "restore";
  return null;
}

// ───────────────────────────────────────────
// STOCK THRESHOLDS
// ───────────────────────────────────────────

export const STOCK_THRESHOLDS = {
  LOW_STOCK: 10,
  CRITICAL: 5,
  DEFAULT_ALERT: 10,
} as const;

// ───────────────────────────────────────────
// DEFAULTS
// ───────────────────────────────────────────

export const PRODUCT_DEFAULTS = {
  DEFAULT_CURRENCY: "USD" as const,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;