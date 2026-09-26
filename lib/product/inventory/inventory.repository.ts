// lib/product/inventory/inventory.repository.ts
// =============================================================================
// INVENTAIRE — REPOSITORY (seul point d'accès à Prisma dans ce module)
// =============================================================================
// AUCUNE décision métier ici : ce fichier exécute, il ne refuse rien.
// Les gardes (stock insuffisant, conflits) vivent dans le service, qui
// transforme les compteurs de lignes renvoyés ici en erreurs métier.
//
// Toutes les fonctions acceptent un `db` : le service y passe son client
// transactionnel pour garantir l'atomicité des DEUX couches de stock.

import { prisma } from "@/lib/prisma";
import type { Tx } from "./inventory.types";

type Db = Tx | typeof prisma;

/** Variante + produit parent + stock agrégé produit, pour un ajustement. */
export async function findVariantForUpdate(db: Db, variantId: string) {
  return db.productVariant.findUnique({
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
}

/**
 * Ligne VariantStock pour (variante, entrepôt).
 *
 * ATTENTION — `warehouseId: null` : PostgreSQL considère les NULL comme
 * distincts dans un index unique, donc `findUnique({ variantId_warehouseId })`
 * NE garantit PAS l'unicité quand l'entrepôt est nul. On liste donc par
 * `warehouseId` et on prend la première ligne.
 */
export async function findVariantStock(
  db: Db,
  variantId: string,
  warehouseId: string | null,
) {
  const rows = await db.variantStock.findMany({
    where: { variantId, warehouseId },
    take: 2,
  });
  return rows[0] ?? null;
}

export async function createVariantStock(
  db: Db,
  data: { variantId: string; warehouseId: string | null; userId: string | null },
) {
  return db.variantStock.create({
    data: {
      variantId: data.variantId,
      warehouseId: data.warehouseId,
      quantity: 0,
      reserved: 0,
      updatedBy: data.userId ?? undefined,
    },
  });
}

/**
 * Écriture CONDITIONNELLE de la quantité : `updateMany` avec garde
 * `quantity >= n` verrouille la ligne et refuse un gaspillage si une
 * transaction concurrente a déjà décrémenté. `count === 0` ⇒ conflit.
 */
export async function applyQuantityDelta(
  db: Db,
  id: string,
  appliedDelta: number,
  userId: string | null,
) {
  return db.variantStock.updateMany({
    where: { id, quantity: { gte: Math.max(0, -appliedDelta) } },
    data: {
      quantity: { increment: appliedDelta },
      lastMovementAt: new Date(),
      updatedBy: userId,
    },
  });
}

export async function adjustReserved(
  db: Db,
  id: string,
  delta: number,
  userId: string | null,
) {
  return db.variantStock.updateMany({
    where: { id, reserved: { gte: Math.max(0, -delta) } },
    data: {
      reserved: { increment: delta },
      lastMovementAt: new Date(),
      updatedBy: userId,
    },
  });
}

/** Agrégat produit : somme des quantités sur le produit parent. */
export async function aggregateForProduct(db: Db, productId: string) {
  return db.variantStock.aggregate({
    where: { variant: { productId } },
    _sum: { quantity: true, reserved: true },
  });
}

export async function upsertProductStock(
  db: Db,
  productId: string,
  totals: { quantity: number; reserved: number },
  userId: string | null,
) {
  const quantity = Math.max(0, totals.quantity);
  const reserved = Math.max(0, totals.reserved);
  return db.stock.upsert({
    where: { productId },
    create: {
      productId,
      quantity,
      reserved,
      updatedBy: userId ?? undefined,
    },
    update: {
      quantity,
      reserved,
      lastMovementAt: new Date(),
      updatedBy: userId ?? undefined,
    },
    select: { id: true },
  });
}

/** Trace de mouvement (table StockMovement). */
export async function createMovement(
  db: Db,
  data: {
    stockId: string;
    type: "IN" | "OUT" | "ADJUSTMENT" | "RESERVATION" | "RELEASE" | "RETURN";
    quantity: number;
    reason: string | null;
    orderId: string | null;
    userId: string | null;
  },
) {
  return db.stockMovement.create({
    data: {
      stockId: data.stockId,
      type: data.type,
      quantity: data.quantity,
      delta: data.quantity,
      reason: data.reason,
      orderId: data.orderId,
      userId: data.userId,
    },
    select: { id: true },
  });
}

/** Ledger métier (table InventoryTransaction). */
export async function createLedgerEntry(
  db: Db,
  data: {
    productId: string;
    variantId: string;
    quantity: number;
    reason: "RESTOCK" | "SALE" | "RETURN" | "SHRINKAGE";
    referenceId: string | null;
    warehouseId: string | null;
    performedBy: string | null;
  },
) {
  return db.inventoryTransaction.create({
    data: {
      productId: data.productId,
      variantId: data.variantId,
      quantity: data.quantity,
      reason: data.reason,
      referenceId: data.referenceId,
      warehouseId: data.warehouseId,
      performedBy: data.performedBy,
    },
    select: { id: true },
  });
}

/** Projection de disponibilité consommée par le storefront. */
export async function upsertAvailabilityProjection(
  db: Db,
  productId: string,
  isAvailable: boolean,
) {
  return db.product_Availability_Projection.upsert({
    where: { productId },
    create: { productId, isAvailable },
    update: { isAvailable },
  });
}

/** Photo point-in-time du stock d'une variante. */
export async function upsertSnapshot(
  db: Db,
  data: {
    productId: string;
    variantId: string;
    available: number;
    reserved: number;

/** ─── Lectures de disponibilité (couche repository) ─────────────────────── */

/** Ligne de stock d'une variante pour un entrepôt donné. */
export async function readVariantStock(
  variantId: string,
  warehouseId: string | null,
) {
  return prisma.variantStock.findFirst({
    where: { variantId, warehouseId },
    select: { quantity: true, reserved: true, alertThreshold: true },
  });
}

/** Agrégat + détail des stocks d'un produit. */
export async function readProductStocks(productId: string) {
  const [aggregate, rows] = await Promise.all([
    prisma.variantStock.aggregate({
      where: { variant: { productId } },
      _sum: { quantity: true, reserved: true },
    }),
    prisma.variantStock.findMany({
      where: { variant: { productId } },
      select: { quantity: true, reserved: true, alertThreshold: true },
    }),
  ]);
  return { aggregate, rows };
}

/** Projection de disponibilité d'un produit. */
export async function readAvailabilityProjection(productId: string) {
  return prisma.product_Availability_Projection.findUnique({
    where: { productId },
    select: { isAvailable: true },
  });
}

/** Compteur de produits en rupture (via projection). */
export async function countOutOfStockProducts() {
  return prisma.product_Availability_Projection.count({
    where: { isAvailable: false },
  });
}

/** Groupement par (quantity, reserved, seuil) pour les KPI. */
export async function groupStocksForKpis() {
  return prisma.variantStock.groupBy({
    by: ["quantity", "reserved", "alertThreshold"],
    _count: { variantId: true },
  });
}

/** Totaux du stock, toutes variantes confondues. */
export async function sumAllStocks() {
  return prisma.variantStock.aggregate({
    _sum: { quantity: true, reserved: true },
  });
}

/** Variantes sous leur seuil d'alerte (réapprovisionnement). */
export async function readStocksBelowThreshold(limit: number) {
  return prisma.variantStock.findMany({
    where: { quantity: { lte: prisma.variantStock.fields.alertThreshold } },
    take: limit,
    orderBy: { quantity: "asc" },
    select: {
      variantId: true,
      quantity: true,
      reserved: true,
      alertThreshold: true,
      variant: {
        select: {
          sku: true,
          productId: true,
          product: { select: { name: true } },
        },
      },
    },
  });
}

/** Réservations expirées (nettoyage / cron). */
export async function readExpiredReservations(limit: number) {
  return prisma.stockReservation.findMany({
    where: { expiresAt: { lt: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: limit,
    select: { id: true, orderId: true, variantId: true, quantity: true },
  });
}

    warehouseId: string | null;
  },
) {
  // Find-then-write assumé : `@@unique([productId, variantId])` est composite
  // et l'écriture doit rester tolérante à une ligne créée hors de ce module.
  const existing = await db.inventorySnapshot.findFirst({
    where: { productId: data.productId, variantId: data.variantId },
    select: { id: true },
  });
  if (existing) {
    return db.inventorySnapshot.update({
      where: { id: existing.id },
      data: {
        available: data.available,
        reserved: data.reserved,
        warehouseId: data.warehouseId,
      },
    });
  }
  return db.inventorySnapshot.create({
    data: {
      productId: data.productId,
      variantId: data.variantId,
      available: data.available,
      reserved: data.reserved,
      warehouseId: data.warehouseId,
    },
  });
}
