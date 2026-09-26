// lib/product/inventory/reservation.service.ts
// =============================================================================
// RÉSERVATIONS DE STOCK
// =============================================================================
// Réserver n'est PAS sortir : on incrémente `reserved` SANS toucher à
// `quantity`. C'est ce qui distingue une réservation d'une vente — une
// réservation annulée libère du stock, elle ne le recrée pas.
//
// `available = quantity - reserved` : la garde anti-overselling porte donc
// sur le DISPONIBLE, pas sur la quantité brute.

import { prisma } from "@/lib/prisma";
import {
  aggregateForProduct,
  adjustReserved,
  createVariantStock,
  findVariantForUpdate,
  findVariantStock,
  upsertAvailabilityProjection,
  upsertProductStock,
} from "./inventory.repository";
import {
  INVENTORY_ERRORS,
  InventoryError,
  type ReserveStockInput,
  type ReserveStockResult,
} from "./inventory.types";

const DEFAULT_TTL_MINUTES = 15;

const TRANSACTION_OPTIONS = {
  isolationLevel: "Serializable" as const,
  maxWait: 5000,
  timeout: 15000,
};

/**
 * Réserve `quantity` unités pour une variante.
 * @throws InventoryError INSUFFICIENT_STOCK si le DISPONIBLE est trop faible.
 */
export async function reserveStock(
  input: ReserveStockInput,
): Promise<ReserveStockResult> {
  const { variantId, quantity, warehouse = null, orderId = null } = input;
  const userId = input.userId ?? null;
  const ttl = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new InventoryError(
      "La quantité à réserver doit être un entier positif",
      INVENTORY_ERRORS.INVALID_QUANTITY,
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const variant = await findVariantForUpdate(tx, variantId);
      if (!variant) {
        throw new InventoryError(
          `Variante introuvable : ${variantId}`,
          INVENTORY_ERRORS.VARIANT_NOT_FOUND,
          404,
        );
      }

      let variantStock = await findVariantStock(tx, variantId, warehouse);
      if (!variantStock) {
        variantStock = await createVariantStock(tx, {
          variantId,
          warehouseId: warehouse,
          userId,
        });
      }

      // La garde porte sur le DISPONIBLE (quantity - reserved).
      const available = variantStock.quantity - variantStock.reserved;
      if (available < quantity) {
        throw new InventoryError(
          `Stock insuffisant : disponible=${available}, demandé=${quantity}`,
          INVENTORY_ERRORS.INSUFFICIENT_STOCK,
          409,
        );
      }

      const updated = await adjustReserved(tx, variantStock.id, quantity, userId);
      if (updated.count === 0) {
        throw new InventoryError(
          "Réservation concurrente en cours, réessayez",
          INVENTORY_ERRORS.CONCURRENT_CONFLICT,
          409,
        );
      }

      // Trace l'échéance de la réservation (StockReservation).
      const expiresAt = new Date(Date.now() + ttl * 60_000);
      if (orderId) {
        await tx.stockReservation.create({
          data: { orderId, variantId, quantity, expiresAt },
        });
      }

      // Les DEUX couches doivent refléter la réservation.
      const aggregated = await aggregateForProduct(tx, variant.productId);
      await upsertProductStock(
        tx,
        variant.productId,
        {
          quantity: aggregated._sum.quantity ?? variantStock.quantity,
          reserved: aggregated._sum.reserved ?? variantStock.reserved + quantity,
        },
        userId,
      );

      const newReserved = variantStock.reserved + quantity;
      const newAvailable = variantStock.quantity - newReserved;
      await upsertAvailabilityProjection(
        tx,
        variant.productId,
        newAvailable > 0,
      );

      return { variantId, reserved: newReserved, available: newAvailable, expiresAt };
    },
    TRANSACTION_OPTIONS,
  );
}

/**
 * Libère une réservation : `reserved` décroît, `quantity` est INCHANGÉE.
 * @param quantity quantité libérée ; par défaut toute la réservation courante.
 */
export async function releaseStock(
  variantId: string,
  options: {
    quantity?: number;
    warehouse?: string | null;
    userId?: string | null;
  } = {},
): Promise<ReserveStockResult> {
  const { warehouse = null, userId = null } = options;

  return prisma.$transaction(
    async (tx) => {
      const variant = await findVariantForUpdate(tx, variantId);
      if (!variant) {
        throw new InventoryError(
          `Variante introuvable : ${variantId}`,
          INVENTORY_ERRORS.VARIANT_NOT_FOUND,
          404,
        );
      }

      const variantStock = await findVariantStock(tx, variantId, warehouse);
      if (!variantStock) {
        throw new InventoryError(
          "Aucune réservation à libérer",
          INVENTORY_ERRORS.INSUFFICIENT_STOCK,
          409,
        );
      }

      // On ne libère jamais plus que ce qui est réellement réservé.
      const release = Math.min(
        options.quantity ?? variantStock.reserved,
        variantStock.reserved,
      );
      if (release <= 0) {
        throw new InventoryError("Rien à libérer", INVENTORY_ERRORS.INVALID_QUANTITY);
      }

      const updated = await adjustReserved(tx, variantStock.id, -release, userId);
      if (updated.count === 0) {
        throw new InventoryError(
          "Libération concurrente en cours, réessayez",
          INVENTORY_ERRORS.CONCURRENT_CONFLICT,
          409,
        );
      }

      const aggregated = await aggregateForProduct(tx, variant.productId);
      await upsertProductStock(
        tx,
        variant.productId,
        {
          quantity: aggregated._sum.quantity ?? variantStock.quantity,
          reserved:
            aggregated._sum.reserved ??
            Math.max(0, variantStock.reserved - release),
        },
        userId,
      );

      const newReserved = variantStock.reserved - release;
      const newAvailable = variantStock.quantity - newReserved;
      await upsertAvailabilityProjection(tx, variant.productId, newAvailable > 0);

      return {
        variantId,
        reserved: newReserved,
        available: newAvailable,
        expiresAt: new Date(),
      };
    },
    TRANSACTION_OPTIONS,
  );
}

/** Réservations expirées (nettoyage / cron). */
export async function listExpiredReservations(limit = 100) {
  return prisma.stockReservation.findMany({
    where: { expiresAt: { lt: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: { id: true, orderId: true, variantId: true, quantity: true },
  });
}
