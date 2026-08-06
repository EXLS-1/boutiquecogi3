// prisma/seed/factories/inventory.factory.ts
// ============================================
// GÉNÉRATEUR DE STOCK & MOUVEMENTS D'INVENTAIRE
// ============================================

import { generateDeterministicUuidV7 } from "../utils/uuid";
import { TransactionType } from "@prisma/client";

export interface GeneratedStock {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  alertThreshold: number;
  warehouse: string;
}

export interface GeneratedInventoryTx {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  reason: TransactionType;
  referenceId?: string;
  warehouseId?: string;
  performedBy?: string;
}

const WAREHOUSES = ["Entrepôt Kinshasa", "Entrepôt Lubumbashi", "Entrepôt Goma"] as const;

/**
 * Construit un stock initial pour un produit.
 * Déterministe via l'index.
 */
export function buildStockFactory(index: number, productId: string): GeneratedStock {
  return {
    id: generateDeterministicUuidV7("stock", index),
    productId,
    quantity: (index * 7) % 200 + 10, // 10-209 unités
    reserved: 0,
    alertThreshold: 10,
    warehouse: WAREHOUSES[index % WAREHOUSES.length],
  };
}

/**
 * Construit une transaction d'inventaire (RESTOCK / SALE / RETURN / SHRINKAGE).
 */
export function buildInventoryTxFactory(
  index: number,
  productId: string,
  options: {
    variantId?: string;
    quantity?: number;
    reason?: TransactionType;
    referenceId?: string;
    performedBy?: string;
  } = {},
): GeneratedInventoryTx {
  const reason = options.reason ?? TransactionType.RESTOCK;
  const signedQuantity =
    reason === TransactionType.RESTOCK
      ? Math.abs(options.quantity ?? 20)
      : -(Math.abs(options.quantity ?? 1));

  return {
    id: generateDeterministicUuidV7("inventory_tx", index),
    productId,
    variantId: options.variantId,
    quantity: signedQuantity,
    reason,
    referenceId: options.referenceId,
    warehouseId: undefined,
    performedBy: options.performedBy,
  };
}
