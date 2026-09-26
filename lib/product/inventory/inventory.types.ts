// lib/product/inventory/inventory.types.ts
// =============================================================================
// INVENTAIRE — Types du domaine
// =============================================================================
// Deux couches de stock coexistent (CONTRAT N°5) :
//   - VariantStock  : couche CANONIQUE, au niveau SKU × entrepôt.
//   - Stock         : agrégat 1:1 produit, rétrocompatibilité.
// Toute écriture passe par inventory.service.ts, qui maintient les DEUX dans
// une même transaction. `available = quantity - reserved` est DÉRIVÉ et
// n'est jamais persisté.

import type { Prisma } from "@prisma/client";

/** Raison métier d'un mouvement — mappée vers les enums Prisma côté service. */
export type InventoryReason =
  | "INITIAL"
  | "RESTOCK"
  | "SALE"
  | "RETURN"
  | "SHRINKAGE"
  | "ADJUSTMENT"
  | "RESERVATION"
  | "RELEASE";

export interface AdjustStockInput {
  variantId: string;
  /** Variation appliquée : > 0 = entrée, < 0 = sortie. */
  delta: number;
  reason: InventoryReason;
  /** Entrepôt cible (null / absent = entrepôt principal). */
  warehouse?: string | null;
  /** `true` = `delta` est une quantité ABSOLUE, pas une variation. */
  absolute?: boolean;
  referenceId?: string | null;
  notes?: string | null;
  /** Auteur : alimente l'audit, StockMovement.userId et updatedBy. */
  userId?: string | null;
}

export interface AdjustStockResult {
  variantId: string;
  /** Quantité physique après écriture (couche VariantStock). */
  quantity: number;
  reserved: number;
  /** quantity - reserved. */
  available: number;
  /** Agrégat produit après réagrégation (couche Stock). */
  productQuantity: number;
  movementId: string;
  transactionId: string;
}

export interface InventoryAvailability {
  variantId: string;
  quantity: number;
  reserved: number;
  available: number;
  alertThreshold: number;
  isLow: boolean;
  isOutOfStock: boolean;
}

/** Réservation de stock liée à une commande. */
export interface ReserveStockInput {
  variantId: string;
  quantity: number;
  /** Commande à l'origine de la réservation. */
  orderId?: string | null;
  warehouse?: string | null;
  userId?: string | null;
  /** Durée de validité de la réservation (défaut : 15 min). */
  ttlMinutes?: number;
}

export interface ReserveStockResult {
  variantId: string;
  reserved: number;
  available: number;
  expiresAt: Date;
}

export interface StockLevelSummary {
  quantity: number;
  reserved: number;
  available: number;
  variantCount: number;
  outOfStockVariants: number;
  lowStockVariants: number;
}

export interface InventoryKpis {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalAvailableUnits: number;
}

/** Client transactionnel : toute écriture doit être atomique. */
export type Tx = Prisma.TransactionClient;

export class InventoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

/** Codes d'erreur métier — stables, utilisés par les Server Actions. */
export const INVENTORY_ERRORS = {
  VARIANT_NOT_FOUND: "INVENTORY_VARIANT_NOT_FOUND",
  INVALID_DELTA: "INVENTORY_INVALID_DELTA",
  INSUFFICIENT_STOCK: "INVENTORY_INSUFFICIENT_STOCK",
  CONCURRENT_CONFLICT: "INVENTORY_CONCURRENT_CONFLICT",
  INVALID_QUANTITY: "INVENTORY_INVALID_QUANTITY",
  UNREACHABLE: "INVENTORY_UNREACHABLE",
} as const;
