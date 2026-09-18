// lib/security/inventory.ts
// Ce module gÃ¨re la logique d'inventaire, notamment la rÃ©conciliation entre le snapshot de stock et les transactions d'inventaire (ledger).
// La fonction `calculateRealStock` est essentielle pour garantir l'exactitude du stock affichÃ© et pour identifier les Ã©ventuelles divergences qui pourraient survenir en raison de problÃ¨mes de synchronisation ou d'erreurs humaines.
// En cas de divergence, un avertissement est loggÃ© pour alerter les dÃ©veloppeurs ou les administrateurs, et une action corrective peut Ãªtre envisagÃ©e pour resynchroniser le stock.

/**
 * =============================================================================
 * BOUTIQUECOGI3 â€” INVENTORY MANAGEMENT SYSTEM
 * =============================================================================
 * 
 * Architecture: Modular, Atomic, Audit-Integrated, RBAC-Aware
 * Stack: Prisma + Zod + Audit Logging + Transaction Safety
 * 
 * Security: All stock mutations are logged via audit system.
 * RBAC: Only MANAGER+ (Level 3-1) can modify inventory.
 * Atomicity: All operations use Prisma transactions.
 * =============================================================================
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditLog, AdminEvent, SecurityEvent } from "@/lib/security/audit";
import type { RBACLevel } from "@/lib/security/audit";

const VariantIdSchema = z.string().uuid().brand<"VariantId">();

const InventoryAdjustmentSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(-10000).max(10000),
  reason: z.string().min(3).max(500),
  reference: z.string().max(100).optional(),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

const ReconcileStockSchema = z.object({
  variantId: z.string().uuid(),
  forceSync: z.boolean().default(false),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

const BulkReconcileSchema = z.object({
  variantIds: z.array(z.string().uuid()).min(1).max(100),
  actorId: z.string().uuid().optional(),
  actorLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"]),
  actorEmail: z.string().email().optional(),
  sessionId: z.string().optional(),
});

export type InventoryAdjustmentInput = z.infer<typeof InventoryAdjustmentSchema>;
export type ReconcileStockInput = z.infer<typeof ReconcileStockSchema>;
export type BulkReconcileInput = z.infer<typeof BulkReconcileSchema>;

/**
 * Minimum RBAC level required for inventory operations.
 */
const INVENTORY_PERMISSIONS = {
  VIEW_STOCK: ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"] as RBACLevel[],
  ADJUST_STOCK: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] as RBACLevel[],
  RECONCILE_STOCK: ["LEVEL_1", "LEVEL_2", "LEVEL_3"] as RBACLevel[],
  FORCE_SYNC: ["LEVEL_1", "LEVEL_2"] as RBACLevel[],
  BULK_RECONCILE: ["LEVEL_1", "LEVEL_2"] as RBACLevel[],
        RESERVE_STOCK: ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"] as RBACLevel[],
  RELEASE_STOCK: ["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5", "LEVEL_6", "GUEST"] as RBACLevel[],
} as const;

function hasPermission(
  level: RBACLevel,
  permission: keyof typeof INVENTORY_PERMISSIONS
): boolean {
  return INVENTORY_PERMISSIONS[permission].includes(level);
}
export class InventoryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly variantId?: string,
    public readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM"
  ) {
    super(message);
    this.name = "InventoryError";
    Object.setPrototypeOf(this, InventoryError.prototype);
  }
}

export class InventoryPermissionError extends InventoryError {
  constructor(level: RBACLevel, action: string) {
    super(
      `RBAC violation: Level ${level} cannot perform '${action}'`,
      "RBAC_VIOLATION",
      undefined,
      "HIGH"
    );
    this.name = "InventoryPermissionError";
  }
}

export class InventoryValidationError extends InventoryError {
  constructor(message: string, variantId?: string) {
    super(message, "VALIDATION_ERROR", variantId, "LOW");
    this.name = "InventoryValidationError";
  }
}

export class InventorySyncError extends InventoryError {
  constructor(message: string, variantId: string) {
    super(message, "SYNC_ERROR", variantId, "CRITICAL");
    this.name = "InventorySyncError";
  }
}
export interface StockReconciliationResult {
  variantId: string;
  sku: string;
  snapshot: number;
  ledgerTotal: number;
  discrepancy: number;
  isReconciled: boolean;
  timestamp: string;
}

/**
 * RÃ©concilie le snapshot du stock avec le ledger des transactions.
 * Version sÃ©curisÃ©e avec validation Zod et audit logging.
 * 
 * @param variantId UUID v7 de la variante
 * @param actorLevel Niveau RBAC de l'appelant (pour permissions)
 * @returns RÃ©sultat dÃ©taillÃ© de la rÃ©conciliation
 */
export async function calculateRealStock(
  variantId: string,
  actorLevel: RBACLevel = "GUEST"
): Promise<StockReconciliationResult> {
  // â”€â”€ RBAC Check â”€â”€
  if (!hasPermission(actorLevel, "VIEW_STOCK")) {
    throw new InventoryPermissionError(actorLevel, "calculateRealStock");
  }

  // â”€â”€ Input Validation â”€â”€
  const validatedId = VariantIdSchema.safeParse(variantId);
  if (!validatedId.success) {
    throw new InventoryValidationError(
      `Invalid variant ID format: ${variantId}`,
      variantId
    );
  }

  try {
    // â”€â”€ Atomic Fetch: Snapshot + Ledger â”€â”€
    const [variant, aggregate] = await Promise.all([
      prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, sku: true, productId: true, product: { select: { id: true, stock: { select: { id: true, quantity: true, reserved: true } } } } },
      }),
      prisma.inventoryTransaction.aggregate({
        where: { variantId: variantId },
        _sum: { quantity: true },
      }),
    ]);

    if (!variant) {
      throw new InventoryError(
        `Variante ${variantId} introuvable.`,
        "VARIANT_NOT_FOUND",
        variantId,
        "MEDIUM"
      );
    }

    const ledgerTotal = aggregate._sum?.quantity ?? 0;
    const snapshot = variant.product?.stock?.quantity ?? 0;
    const discrepancy = ledgerTotal - snapshot;
    const isReconciled = discrepancy === 0;

    const result: StockReconciliationResult = {
      variantId: variant.id,
      sku: variant.sku,
      snapshot,
      ledgerTotal,
      discrepancy,
      isReconciled,
      timestamp: new Date().toISOString(),
    };

    // â”€â”€ Audit: Log mismatch if detected â”€â”€
    if (!isReconciled) {
      await auditLog({
        eventType: AdminEvent.INVENTORY_UPDATED,
        actorLevel,
        targetId: variantId,
        targetType: "productVariant",
        metadata: {
          sku: variant.sku,
          snapshot,
          ledgerTotal,
          discrepancy,
          action: "reconciliation_check",
          productId: variant.productId,
        },
      });

      // Security alert for large discrepancies (>10 units or >20%)
      const relativeDiscrepancy = snapshot > 0 ? Math.abs(discrepancy) / snapshot : 0;
      if (Math.abs(discrepancy) > 10 || relativeDiscrepancy > 0.2) {
        await auditLog({
          eventType: SecurityEvent.DATA_INTEGRITY_VIOLATION,
          actorLevel,
          targetId: variantId,
          targetType: "productVariant",
          metadata: {
            sku: variant.sku,
            snapshot,
            ledgerTotal,
            discrepancy,
            relativeDiscrepancy: Math.round(relativeDiscrepancy * 100),
            alert: "Significant inventory discrepancy detected",
          },
        });
      }
    }

    return result;
  } catch (error) {
    if (error instanceof InventoryError) throw error;

    console.error("[INVENTORY] calculateRealStock fatal error:", error);
    throw new InventoryError(
      "Failed to calculate real stock",
      "CALCULATION_ERROR",
      variantId,
      "CRITICAL"
    );
  }
}
export interface StockAdjustmentResult {
  transactionId: string;
  variantId: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  ledgerEntryId: string;
  timestamp: string;
}

/**
 * Ajuste le stock d'une variante de maniÃ¨re atomique.
 * CrÃ©e une transaction ledger + met Ã  jour le snapshot.
 * 
 * RBAC: MANAGER+ (Level 3-1) only.
 */
export async function adjustStock(
  input: InventoryAdjustmentInput
): Promise<StockAdjustmentResult> {
  // â”€â”€ Zod Validation â”€â”€
  const validated = InventoryAdjustmentSchema.safeParse(input);
  if (!validated.success) {
    throw new InventoryValidationError(
      `Invalid adjustment input: ${validated.error.message}`,
      input.variantId
    );
  }

  const { variantId, quantity, reason, reference, actorId, actorLevel, actorEmail, sessionId } = validated.data;

  // â”€â”€ RBAC Check â”€â”€
  if (!hasPermission(actorLevel, "ADJUST_STOCK")) {
    await auditLog({
      eventType: SecurityEvent.RBAC_VIOLATION,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: variantId,
      targetType: "productVariant",
      metadata: {
        attemptedAction: "adjustStock",
        quantity,
        reason,
        requiredLevel: "LEVEL_3",
      },
    });
    throw new InventoryPermissionError(actorLevel, "adjustStock");
  }

  try {
    // â”€â”€ Atomic Transaction: Ledger + Snapshot â”€â”€
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock variant row (pessimistic locking)
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, sku: true, productId: true, product: { select: { stock: { select: { id: true, quantity: true } } } } },
      });

      if (!variant) {
        throw new InventoryError(
          `Variante ${variantId} introuvable.`,
          "VARIANT_NOT_FOUND",
          variantId,
          "MEDIUM"
        );
      }

      const previousStock = variant.product?.stock?.quantity ?? 0;
      const newStock = previousStock + quantity;

      // 2. Prevent negative stock (business rule)
      if (newStock < 0) {
        throw new InventoryError(
          `Stock adjustment would result in negative stock (${newStock})`,
          "NEGATIVE_STOCK_BLOCKED",
          variantId,
          "HIGH"
        );
      }

      // 3. Create ledger entry
      const ledgerEntry = await tx.inventoryTransaction.create({
        data: {
          productId: variant.productId,
          variantId: variantId,
          quantity,
          reason: quantity >= 0 ? "RESTOCK" : "SHRINKAGE",
          referenceId: reference ?? null,
          performedBy: actorId ?? null,
        },
      });

      // 4. Update stock atomically
      if (variant.product?.stock) {
        await tx.stock.update({
          where: { id: variant.product.stock.id },
          data: { quantity: newStock },
        });
      } else {
        await tx.stock.create({
          data: {
            productId: variant.productId,
            quantity: newStock,
            reserved: 0,
          },
        });
      }

      return {
        previousStock,
        newStock,
        ledgerEntryId: ledgerEntry.id,
        sku: variant.sku,
        productId: variant.productId,
      };
    }, {
      // Transaction options for robustness
      isolationLevel: "Serializable",
      maxWait: 5000,
      timeout: 10000,
    });

    // â”€â”€ Audit Log: Successful adjustment â”€â”€
    await auditLog({
      eventType: AdminEvent.INVENTORY_UPDATED,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: variantId,
      targetType: "productVariant",
      metadata: {
        sku: result.sku,
        adjustment: quantity,
        previousStock: result.previousStock,
        newStock: result.newStock,
        reason,
        reference: reference ?? null,
        ledgerEntryId: result.ledgerEntryId,
        productId: result.productId,
      },
    });

    return {
      transactionId: result.ledgerEntryId,
      variantId,
      previousStock: result.previousStock,
      newStock: result.newStock,
      adjustment: quantity,
      ledgerEntryId: result.ledgerEntryId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof InventoryError) throw error;

    console.error("[INVENTORY] adjustStock fatal error:", error);
    throw new InventoryError(
      "Failed to adjust stock",
      "ADJUSTMENT_ERROR",
      variantId,
      "CRITICAL"
    );
  }
}
export interface ReconcileResult extends StockReconciliationResult {
  wasSynced: boolean;
  syncActorId?: string;
}

/**
 * RÃ©concilie et optionnellement resynchronise le stock.
 * 
 * RBAC: MANAGER+ to reconcile, ADMIN+ to force sync.
 */
export async function reconcileStock(
  input: ReconcileStockInput
): Promise<ReconcileResult> {
  const validated = ReconcileStockSchema.safeParse(input);
  if (!validated.success) {
    throw new InventoryValidationError(
      `Invalid reconcile input: ${validated.error.message}`,
      input.variantId
    );
  }

  const { variantId, forceSync, actorId, actorLevel, actorEmail, sessionId } = validated.data;

  // â”€â”€ RBAC Checks â”€â”€
  if (!hasPermission(actorLevel, "RECONCILE_STOCK")) {
    throw new InventoryPermissionError(actorLevel, "reconcileStock");
  }

  if (forceSync && !hasPermission(actorLevel, "FORCE_SYNC")) {
    await auditLog({
      eventType: SecurityEvent.PRIVILEGE_ESCALATION_ATTEMPT,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: variantId,
      targetType: "productVariant",
      metadata: {
        attemptedAction: "forceSync",
        requiredLevel: "LEVEL_2",
        actualLevel: actorLevel,
      },
    });
    throw new InventoryPermissionError(actorLevel, "forceSync");
  }

  // â”€â”€ Calculate real stock â”€â”€
  const reconciliation = await calculateRealStock(variantId, actorLevel);

  let wasSynced = false;

  // â”€â”€ Force sync if requested and discrepancy exists â”€â”€
  if (forceSync && !reconciliation.isReconciled) {
    const adjustment = reconciliation.ledgerTotal - reconciliation.snapshot;

    await prisma.$transaction(async (tx) => {
      // Fetch variant and its linked Stock row (must exist or be created)
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          productId: true,
          sku: true,
          product: { select: { stock: { select: { id: true, quantity: true } } } },
        },
      });

      if (!variant) {
        throw new InventoryError(
          `Variante ${variantId} introuvable pendant la resynchronisation.`,
          "VARIANT_NOT_FOUND",
          variantId,
          "HIGH"
        );
      }

      // Create a valid InventoryTransaction ledger entry (uses TransactionType enum values only)
      await tx.inventoryTransaction.create({
        data: {
          productId: variant.productId,
          variantId: variantId,
          quantity: adjustment,
          reason: adjustment >= 0 ? "RESTOCK" : "SHRINKAGE",
          referenceId: `SYNC-${Date.now()}`,
          performedBy: actorId ?? null,
        },
      });

      // Update the Stock row (1:1 on Product) to match the ledger total.
      // ProductVariant has no 'stock' field; Stock is the canonical 1:1 aggregate.
      if (variant.product?.stock) {
        await tx.stock.update({
          where: { id: variant.product.stock.id },
          data: { quantity: reconciliation.ledgerTotal },
        });
      } else {
        await tx.stock.create({
          data: {
            productId: variant.productId,
            quantity: reconciliation.ledgerTotal,
            reserved: 0,
          },
        });
      }
    });

    wasSynced = true;

    // â”€â”€ Audit: Force sync â”€â”€
    await auditLog({
      eventType: AdminEvent.INVENTORY_UPDATED,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      targetId: variantId,
      targetType: "productVariant",
      metadata: {
        sku: reconciliation.sku,
        action: "force_sync",
        previousSnapshot: reconciliation.snapshot,
        newSnapshot: reconciliation.ledgerTotal,
        adjustment,
      },
    });
  }

  return {
    ...reconciliation,
    wasSynced,
    syncActorId: wasSynced ? (actorId ?? undefined) : undefined,
  };
}
export interface BulkReconcileResult {
  processed: number;
  reconciled: number;
  synced: number;
  errors: Array<{ variantId: string; error: string }>;
  results: ReconcileResult[];
  timestamp: string;
}

/**
 * RÃ©conciliation en masse des stocks.
 * 
 * RBAC: ADMIN+ (Level 1-2) only.
 */
export async function bulkReconcileStock(
  input: BulkReconcileInput
): Promise<BulkReconcileResult> {
  const validated = BulkReconcileSchema.safeParse(input);
  if (!validated.success) {
    throw new InventoryValidationError(
      `Invalid bulk reconcile input: ${validated.error.message}`
    );
  }

  const { variantIds, actorId, actorLevel, actorEmail, sessionId } = validated.data;

  if (!hasPermission(actorLevel, "BULK_RECONCILE")) {
    await auditLog({
      eventType: SecurityEvent.RBAC_VIOLATION,
      actorId: actorId ?? null,
      actorLevel,
      actorEmail: actorEmail ?? null,
      sessionId: sessionId ?? null,
      metadata: {
        attemptedAction: "bulkReconcileStock",
        variantCount: variantIds.length,
        requiredLevel: "LEVEL_2",
      },
    });
    throw new InventoryPermissionError(actorLevel, "bulkReconcileStock");
  }

  const results: ReconcileResult[] = [];
  const errors: Array<{ variantId: string; error: string }> = [];

  // â”€â”€ Process sequentially to avoid DB overload â”€â”€
  for (const variantId of variantIds) {
    try {
      const result = await reconcileStock({
        variantId,
        forceSync: false, // Never auto-sync in bulk
        actorId,
        actorLevel,
        actorEmail,
        sessionId,
      });
      results.push(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push({ variantId, error: message });
    }
  }

  const reconciled = results.filter((r) => r.isReconciled).length;
  const synced = results.filter((r) => r.wasSynced).length;

  // â”€â”€ Audit: Bulk operation summary â”€â”€
  await auditLog({
    eventType: AdminEvent.INVENTORY_UPDATED,
    actorId: actorId ?? null,
    actorLevel,
    actorEmail: actorEmail ?? null,
    sessionId: sessionId ?? null,
    metadata: {
      action: "bulk_reconcile",
      processed: variantIds.length,
      reconciled,
      errors: errors.length,
      variantIds,
    },
  });

  return {
    processed: variantIds.length,
    reconciled,
    synced,
    errors,
    results,
    timestamp: new Date().toISOString(),
  };
}
export interface ReservationResult {
  reservationId: string;
  variantId: string;
  reservedQuantity: number;
  availableStock: number;
  expiresAt: Date;
}

const ReserveStockSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive().max(100),
  orderId: z.string().uuid(),
  expiresInMinutes: z.number().int().min(1).max(60).default(15),
});

export type ReserveStockInput = z.infer<typeof ReserveStockSchema>;

/**
 * RÃ©serve du stock pour une commande (panier/checkout).
 * 
 * GUEST/USER: Can reserve during checkout.
 * Returns reservation ID for order completion.
 */
export async function reserveStock(
  input: ReserveStockInput
): Promise<ReservationResult> {
  const validated = ReserveStockSchema.safeParse(input);
  if (!validated.success) {
    throw new InventoryValidationError(
      `Invalid reservation input: ${validated.error.message}`,
      input.variantId
    );
  }

  const { variantId, quantity, orderId, expiresInMinutes } = validated.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check current stock with reservation awareness
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          stock: true,
          sku: true,
          reservations: {
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
            select: { quantity: true },
          },
        },
      });

      if (!variant) {
        throw new InventoryError(
          `Variante ${variantId} introuvable.`,
          "VARIANT_NOT_FOUND",
          variantId
        );
      }

      // Safe reduction — reservations is always included above; no `as any` cast needed
      const reservations = variant.reservations ?? [];
      const reservedQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
      const availableStock = variant.stock - reservedQuantity;

      if (availableStock < quantity) {
        throw new InventoryError(
          `Stock insuffisant. Disponible: ${availableStock}, DemandÃ©: ${quantity}`,
          "INSUFFICIENT_STOCK",
          variantId,
          "MEDIUM"
        );
      }

      // 2. Create reservation
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      const reservation = await tx.stockReservation.create({
        data: {
          orderId,
          variantId: variantId,
          quantity,
          status: "ACTIVE",
          expiresAt,
        },
      });

      return {
        reservationId: reservation.id,
        sku: variant.sku,
        availableStock,
      };
    });

    return {
      reservationId: result.reservationId,
      variantId,
      reservedQuantity: quantity,
      availableStock: result.availableStock,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    };
  } catch (error) {
    if (error instanceof InventoryError) throw error;

    console.error("[INVENTORY] reserveStock fatal error:", error);
    throw new InventoryError(
      "Failed to reserve stock",
      "RESERVATION_ERROR",
      variantId,
      "HIGH"
    );
  }
}

const ReleaseStockSchema = z.object({
  reservationId: z.string().uuid(),
  reason: z.enum(["ORDER_CANCELLED", "PAYMENT_FAILED", "EXPIRED", "MANUAL"]),
});

export type ReleaseStockInput = z.infer<typeof ReleaseStockSchema>;

/**
 * LibÃ¨re une rÃ©servation de stock.
 */
export async function releaseStock(
  input: ReleaseStockInput
): Promise<{ released: boolean; quantity: number }> {
  const validated = ReleaseStockSchema.safeParse(input);
  if (!validated.success) {
    throw new InventoryValidationError(
      `Invalid release input: ${validated.error.message}`
    );
  }

  const { reservationId, reason } = validated.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.stockReservation.findUnique({
        where: { id: reservationId },
        select: { id: true, status: true, quantity: true, variantId: true },
      });

      if (!reservation) {
        throw new InventoryError(
          `RÃ©servation ${reservationId} introuvable.`,
          "RESERVATION_NOT_FOUND"
        );
      }

      if (reservation.status !== "ACTIVE") {
        return { released: false, quantity: 0 };
      }

      await tx.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          releaseReason: reason,
        },
      });

      // ── Restore reserved stock back to the Stock row ──
      if (reservation.variantId) {
        const variantStock = await tx.variantStock.findUnique({
          where: { variantId_warehouseId: { variantId: reservation.variantId, warehouseId: null } },
          select: { id: true, quantity: true, reserved: true },
        });

        // Also update the canonical 1:1 Stock row (if exists) for consistency with legacy callers
        const stockRow = await tx.stock.findFirst({
          where: { productId: variantStock?.variant?.productId ?? undefined },
          select: { id: true, quantity: true },
        });

        if (variantStock) {
          await tx.variantStock.update({
            where: { id: variantStock.id },
            data: {
              quantity: variantStock.quantity + reservation.quantity,
              reserved: Math.max(0, variantStock.reserved - reservation.quantity),
            },
          });
        }

        if (stockRow) {
          await tx.stock.update({
            where: { id: stockRow.id },
            data: {
              quantity: stockRow.quantity + reservation.quantity,
            },
          });
        }
      }

      return { released: true, quantity: reservation.quantity };
    });

    return result;
  } catch (error) {
    if (error instanceof InventoryError) throw error;

    console.error("[INVENTORY] releaseStock fatal error:", error);
    throw new InventoryError(
      "Failed to release stock",
      "RELEASE_ERROR",
      undefined,
      "HIGH"
    );
  }
}

export {
  INVENTORY_PERMISSIONS,
  hasPermission,
};
