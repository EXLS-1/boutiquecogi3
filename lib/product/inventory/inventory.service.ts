// lib/product/inventory/inventory.service.ts
// =============================================================================
// INVENTAIRE — SERVICE (logique métier, AUCUN import Prisma direct)
// =============================================================================
// JAMAIS de `prisma.stock.update()` ni `prisma.variantStock.update()` direct :
// tout passe par `adjustStock()`, qui DANS UNE TRANSACTION serializable :
//   1. verrouille la ligne VariantStock (updateMany avec garde `quantity >= n`)
//   2. écrit le StockMovement (traçabilité)
//   3. écrit l'InventoryTransaction (ledger)
//   4. met à jour l'InventorySnapshot (point-in-time)
//   5. réagrège la couche Stock 1:1 produit (rétrocompatibilité)
//   6. upsert la projection de disponibilité
//
// Garde anti-overselling : une sortie est refusée si quantity < |delta|.
// P2034 (conflit de sérialisation) ⇒ retry borné.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  aggregateForProduct,
  applyQuantityDelta,
  createLedgerEntry,
  createMovement,
  createVariantStock,
  findVariantForUpdate,
  findVariantStock,
  upsertAvailabilityProjection,
  upsertProductStock,
  upsertSnapshot,
} from "./inventory.repository";
import {
  INVENTORY_ERRORS,
  InventoryError,
  type AdjustStockInput,
  type AdjustStockResult,
  type InventoryReason,
  type Tx,
} from "./inventory.types";

const TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5000,
  timeout: 15000,
};

const MAX_RETRIES = 2;

/** Raison métier → couple d'enums Prisma (movement + ledger). */
function mapReason(
  reason: InventoryReason,
  delta: number,
): {
  stockType: "IN" | "OUT" | "ADJUSTMENT" | "RESERVATION" | "RELEASE" | "RETURN";
  txType: "RESTOCK" | "SALE" | "RETURN" | "SHRINKAGE";
} {
  switch (reason.toUpperCase()) {
    case "INITIAL":
    case "RESTOCK":
      return { stockType: "IN", txType: "RESTOCK" };
    case "SALE":
      return { stockType: "OUT", txType: "SALE" };
    case "RETURN":
      return { stockType: "RETURN", txType: "RETURN" };
    case "RESERVATION":
      return { stockType: "RESERVATION", txType: "SHRINKAGE" };
    case "RELEASE":
      return { stockType: "RELEASE", txType: "RESTOCK" };
    case "SHRINKAGE":
      return { stockType: "ADJUSTMENT", txType: "SHRINKAGE" };
    default:
      return {
        stockType: "ADJUSTMENT",
        txType: delta >= 0 ? "RESTOCK" : "SHRINKAGE",
      };
  }
}

/**
 * Ajuste le stock d'une variante : point d'entrée unique côté mutations.
 * @throws InventoryError (code stable, traduisible par l'Action)
 */
export async function adjustStock(
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        (tx) => adjustStockInTx(tx, input),
        TRANSACTION_OPTIONS,
      );
    } catch (error) {
      // P2034 : deux transactions ont touché la même ligne → on rejoue.
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (retryable && attempt < MAX_RETRIES) continue;
      throw error;
    }
  }
  throw new InventoryError(
    "Inventaire inatteignable après retries",
    INVENTORY_ERRORS.UNREACHABLE,
    503,
  );
}

/** Version transactionnelle : réutilisable dans une transaction métier plus large. */
export async function adjustStockInTx(
  tx: Tx,
  input: AdjustStockInput,
): Promise<AdjustStockResult> {
  const { variantId, delta, reason, warehouse = null } = input;
  const userId = input.userId ?? null;

  if (delta === 0 && !input.absolute) {
    throw new InventoryError(
      "Le delta ne peut pas être 0",
      INVENTORY_ERRORS.INVALID_DELTA,
    );
  }

  // ── 0. Variante + produit parent ────────────────────────────────────────
  const variant = await findVariantForUpdate(tx, variantId);
  if (!variant) {
    throw new InventoryError(
      `Variante introuvable : ${variantId}`,
      INVENTORY_ERRORS.VARIANT_NOT_FOUND,
      404,
    );
  }

  // ── 1. Ligne VariantStock (créée à la volée) ────────────────────────────
  let variantStock = await findVariantStock(tx, variantId, warehouse);
  if (!variantStock) {
    variantStock = await createVariantStock(tx, {
      variantId,
      warehouseId: warehouse,
      userId,
    });
  }

  const current = variantStock.quantity;
  const target = input.absolute ? delta : current + delta;

  if (target < 0) {
    throw new InventoryError(
      `Stock insuffisant : disponible=${current}, demandé=${-delta}`,
      INVENTORY_ERRORS.INSUFFICIENT_STOCK,
      409,
    );
  }

  const appliedDelta = target - current;

  // ── 2. Écriture conditionnelle (verrou + garde anti-overselling) ────────
  const updated = await applyQuantityDelta(tx, variantStock.id, appliedDelta, userId);
  if (updated.count === 0) {
    throw new InventoryError(
      "Stock modifié par une autre transaction",
      INVENTORY_ERRORS.CONCURRENT_CONFLICT,
      409,
    );
  }

  // ── 3. Réagrégation de la couche Stock produit (rétrocompatibilité) ─────
  const aggregated = await aggregateForProduct(tx, variant.productId);
  const totalQuantity = aggregated._sum.quantity ?? target;
  const totalReserved = aggregated._sum.reserved ?? 0;

  const stockRow = await upsertProductStock(
    tx,
    variant.productId,
    { quantity: totalQuantity, reserved: totalReserved },
    userId,
  );

  // ── 4. Traçabilité : mouvement + ledger ─────────────────────────────────
  const { stockType, txType } = mapReason(reason, appliedDelta);
  const movement = await createMovement(tx, {
    stockId: stockRow.id,
    type: stockType,
    quantity: appliedDelta,
    reason: input.notes ?? reason,
    orderId: input.referenceId ?? null,
    userId,
  });

  const ledger = await createLedgerEntry(tx, {
    productId: variant.productId,
    variantId,
    quantity: appliedDelta,
    reason: txType,
    referenceId: input.referenceId ?? null,
    warehouseId: warehouse,
    performedBy: userId,
  });

  // ── 5. Snapshot point-in-time ───────────────────────────────────────────
  const available = target - variantStock.reserved;
  await upsertSnapshot(tx, {
    productId: variant.productId,
    variantId,
    available: target,
    reserved: variantStock.reserved,
    warehouseId: warehouse,
  });

  // ── 6. Projection de disponibilité (storefront) ────────────────────────
  await upsertAvailabilityProjection(tx, variant.productId, available > 0);

  return {
    variantId,
    quantity: target,
    reserved: variantStock.reserved,
    available,
    productQuantity: Math.max(0, totalQuantity),
    movementId: movement.id,
    transactionId: ledger.id,
  };
}

