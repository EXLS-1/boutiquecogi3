// lib/product-inventory/inventory.types.ts
// =============================================================================
// INVENTAIRE PRODUIT — Types du domaine
// =============================================================================

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
  /** Delta appliqué : > 0 = entrée, < 0 = sortie. */
  delta: number;
  reason: InventoryReason;
  /** Entrepôt cible (null = principal). */
  warehouse?: string | null;
  /** Ajustement absolu (remplace quantity) au lieu d'un delta. */
  absolute?: boolean;
  referenceId?: string | null;
  notes?: string | null;
  /** Auteur (audit + StockMovement.userId + updatedBy). */
  userId?: string | null;
}

export interface AdjustStockResult {
  variantId: string;
  /** Nouvelle quantité physique (couche VariantStock). */
  quantity: number;
  reserved: number;
  /** quantity - reserved. */
  available: number;
  /** Quantité agrégée produit (couche Stock rétrocompatibilité). */
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

export type { Tx } from "@/lib/product-audit/product-audit.types";
