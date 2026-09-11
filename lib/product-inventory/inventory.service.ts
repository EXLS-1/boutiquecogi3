// lib/product-inventory/inventory.service.ts
// =============================================================================
// INVENTAIRE PRODUIT — Écriture traçable à DEUX couches
// =============================================================================
// JAMAIS de prisma.stock.update() ni prisma.variantStock.update() direct.
//
// Toute écriture passe par adjustVariantStock() qui, DANS UNE TRANSACTION
// Serializable (alignée sur lib/products/productService.ts) :
//   1. Verrouille la ligne VariantStock (updateMany avec garde quantity >= X)
//   2. Crée StockMovement (traçabilité, enum StockMovementType)
//   3. Crée InventoryTransaction (ledger, enum TransactionType)
//   4. Crée InventorySnapshot (point-in-time variantId)
//   5. Réagrège la couche Stock 1:1 produit (rétrocompatibilité)
//   6. Upsert la projection Product_Availability_Projection
//   7. Écrit l'AuditLog (PRODUCT_STOCK_ADJUSTED)
//
// Garde anti-overselling : sortie refusée si quantity < |delta| (P2034 retry).

import {
  Prisma,
  StockMovementType,
  TransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordProductAudit, PRODUCT_AUDIT_ACTIONS } from "@/lib/product-audit";
import type {
  AdjustStockInput,
  AdjustStockResult,
  Tx,
} from "./inventory.types";

const TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5000,
  timeout: 15000,
};

const MAX_RETRIES = 2;

/** Mappe une raison domaine vers les enums du schéma (aligné productService). */
function mapReason(
  reason: string,
  delta: number
): { stockType: StockMovementType; txType: TransactionType } {
  switch (reason.toUpperCase()) {
    case "INITIAL":
    case "RESTOCK":
      return { stockType: StockMovementType.IN, txType: TransactionType.RESTOCK };
    case "SALE":
      return { stockType: StockMovementType.OUT, txType: TransactionType.SALE };
    case "RETURN":
      return {
        stockType: StockMovementType.RETURN,
        txType: TransactionType.RETURN,
      };
    case "RESERVATION":
      return {
        stockType: StockMovementType.RESERVATION,
        txType: TransactionType.SHRINKAGE,
      };
    case "RELEASE":
      return {
        stockType: StockMovementType.RELEASE,
        txType: TransactionType.RESTOCK,
      };
    case "SHRINKAGE":
      return {
        stockType: StockMovementType.ADJUSTMENT,
        txType: TransactionType.SHRINKAGE,
      };
    default:
      return {
        stockType: StockMovementType.ADJUSTMENT,
        txType: delta >= 0 ? TransactionType.RESTOCK : TransactionType.SHRINKAGE,
      };
  }
}

/** Ajuste le stock d'une variante de manière traçable (DEUX couches atomiques). */
export async function adjustVariantStock(
  input: AdjustStockInput
): Promise<AdjustStockResult> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => adjustVariantStockInTx(tx, input),
        TRANSACTION_OPTIONS
      );
    } catch (error) {
      // P2034 : conflit de sérialisation → retry
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (isRetryable && attempt < MAX_RETRIES) continue;
      throw error;
    }
  }
  throw new Error("INVENTORY_UNREACHABLE");
}

/** Version transactionnelle (réutilisable dans une transaction métier plus large). */
export async function adjustVariantStockInTx(
  tx: Tx,
  input: AdjustStockInput
): Promise<AdjustStockResult> {
  const { variantId, delta, reason, warehouse = null } = input;
  const userId = input.userId ?? null;

  if (delta === 0 && !input.absolute) {
    throw new Error("INVENTORY_INVALID_DELTA: le delta ne peut pas être 0");
  }

  // ── 0. Charge la variante + produit + stock produit ──
  const variant = await tx.productVariant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      sku: true,
      productId: true,
      product: {
        select: {
          id: true,
          sku: true,
          status: true,
          stock: { select: { id: true, quantity: true, reserved: true } },
        },
      },
    },
  });

  if (!variant) throw new Error(`INVENTORY_VARIANT_NOT_FOUND: ${variantId}`);

  // ── 1. Upsert de la ligne VariantStock ──
  let variantStock = await tx.variantStock.findUnique({
    where: { variantId_warehouse: { variantId, warehouse } },
  });

  if (!variantStock) {
    variantStock = await tx.variantStock.create({
      data: { variantId, warehouse, quantity: 0, reserved: 0, updatedBy: userId },
    });
  }

  const current = variantStock.quantity;
  const target = input.absolute ? delta : current + delta;

  if (target < 0) {
    throw new Error(
      `INVENTORY_INSUFFICIENT_STOCK: disponible=${current}, demandé=${-delta}`
    );
  }

  const appliedDelta = target - current;

  // ── 2. Écriture conditionnelle (verrou ligne + garde >= 0) ──
  const updated = await tx.variantStock.updateMany({
    where: {
      id: variantStock.id,
      quantity: { gte: Math.max(0, -appliedDelta) },
    },
    data: {
      quantity: { increment: appliedDelta },
      lastMovementAt: new Date(),
      updatedBy: userId,
    },
  });

  if (updated.count === 0) {
    throw new Error(
      "INVENTORY_CONCURRENT_CONFLICT: stock modifié par une autre transaction"
    );
  }

  // ── 3. Garantit la couche Stock produit (FK pour StockMovement) ──
  const aggregated = await tx.variantStock.aggregate({
    where: { variant: { productId: variant.productId } },
    _sum: { quantity: true, reserved: true },
  });

  const totalQuantity = aggregated._sum.quantity ?? target;
  const totalReserved = aggregated._sum.reserved ?? 0;

  let stockRow = variant.product.stock;
  if (stockRow) {
    await tx.stock.update({
      where: { id: stockRow.id },
      data: {
        quantity: Math.max(0, totalQuantity),
        reserved: Math.max(0, totalReserved),
        lastMovementAt: new Date(),
        updatedBy: userId ?? undefined,
      },
    });
  } else {
    stockRow = await tx.stock.create({
      data: {
        productId: variant.productId,
        quantity: Math.max(0, totalQuantity),
        reserved: Math.max(0, totalReserved),
        updatedBy: userId ?? undefined,
      },
    });
  }

  // ── 4. StockMovement (traçabilité, FK stockId garantie) ──
  const { stockType, txType } = mapReason(reason, appliedDelta);
  const movement = await tx.stockMovement.create({
    data: {
      stockId: stockRow.id,
      type: stockType,
      quantity: appliedDelta,
      delta: appliedDelta,
      reason: input.notes ?? reason,
      referenceId: input.referenceId ?? undefined,
      userId: userId ?? undefined,
    },
  });

  // ── 4. InventoryTransaction (ledger) ──
  const transaction = await tx.inventoryTransaction.create({
    data: {
      productId: variant.productId,
      variantId,
      quantity: appliedDelta,
      reason: txType,
      referenceId: input.referenceId ?? undefined,
      warehouseId: warehouse ?? undefined,
      performedBy: userId ?? undefined,
    },
  });

  // ── 5. Snapshot point-in-time ──
  await tx.inventorySnapshot.upsert({
    where: {
      productId_variantId: { productId: variant.productId, variantId },
    },
    create: {
      productId: variant.productId,
      variantId,
      available: target,
      reserved: variantStock.reserved,
      warehouseId: warehouse ?? undefined,
    },
    update: {
      available: target,
      reserved: variantStock.reserved,
      warehouseId: warehouse ?? undefined,
    },
  });

  // ── 7. Projection de disponibilité ──
  const isAvailable = target - variantStock.reserved > 0;
  await tx.product_Availability_Projection.upsert({
    where: { productId: variant.productId },
    create: { productId: variant.productId, isAvailable },
    update: { isAvailable },
  });

  // ── 8. Audit (dans la transaction : Product ↔ AuditLog cohérents) ──
  await recordProductAudit(
    {
      action: PRODUCT_AUDIT_ACTIONS.STOCK_ADJUSTED,
      userId,
      productId: variant.productId,
      newValue: {
        variantId,
        delta: appliedDelta,
        reason,
        quantity: target,
        warehouse,
      } as Prisma.InputJsonValue,
      details: `Ajustement ${reason} : ${appliedDelta} (SKU ${variant.sku})`,
    },
    tx
  );

  return {
    variantId,
    quantity: target,
    reserved: variantStock.reserved,
    available: target - variantStock.reserved,
    productQuantity: Math.max(0, totalQuantity),
    movementId: movement.id,
    transactionId: transaction.id,
  };
}


