// lib/product/inventory/availability.service.ts
// =============================================================================
// DISPONIBILITÉ — Lectures agrégées (KPI, badges, storefront)
// =============================================================================
// Règle : JAMAIS charger les mouvements pour calculer une statistique.
// On agrège en base (sum/groupBy/count), on ne ramène jamais de lignes.
// `available` est toujours DÉRIVÉ (quantity - reserved), jamais persisté.
//
// Ce fichier ne fait QUE de l'agrégation métier : toutes les lectures
// passent par inventory.repository.ts (aucun import Prisma ici).

import { prisma } from "@/lib/prisma";
import {
  countOutOfStockProducts,
  groupStocksForKpis,
  readAvailabilityProjection,
  readProductStocks,
  readStocksBelowThreshold,
  readVariantStock,
  sumAllStocks,
} from "./inventory.repository";
import type {
  InventoryAvailability,
  InventoryKpis,
  StockLevelSummary,
} from "./inventory.types";

/** Disponibilité d'une variante (couche canonique VariantStock). */
export async function getVariantAvailability(
  variantId: string,
  warehouseId?: string | null,
): Promise<InventoryAvailability | null> {
  // findFirst (et non findUnique sur la clé composite) car `warehouseId: null`
  // n'est pas couvert par l'unicité PostgreSQL : les NULL sont distincts.
  const row = await readVariantStock(variantId, warehouseId ?? null);
  if (!row) return null;

  const available = row.quantity - row.reserved;
  return {
    variantId,
    quantity: row.quantity,
    reserved: row.reserved,
    available,
    alertThreshold: row.alertThreshold,
    isLow: available <= row.alertThreshold,
    isOutOfStock: available <= 0,
  };
}

/** Disponibilité agrégée d'un produit (somme des variantes). */
export async function getProductAvailability(
  productId: string,
): Promise<StockLevelSummary & { projectionIsAvailable: boolean }> {
  const [{ aggregate, rows }, projection] = await Promise.all([
    readProductStocks(productId),
    readAvailabilityProjection(productId),
  ]);

  const quantity = aggregate._sum.quantity ?? 0;
  const reserved = aggregate._sum.reserved ?? 0;

  return {
    quantity,
    reserved,
    available: quantity - reserved,
    variantCount: rows.length,
    outOfStockVariants: rows.filter((v) => v.quantity - v.reserved <= 0).length,
    lowStockVariants: rows.filter(
      (v) => v.quantity - v.reserved > 0 && v.quantity - v.reserved <= v.alertThreshold,
    ).length,
    projectionIsAvailable: projection?.isAvailable ?? false,
  };
}

/** KPIs inventaire du dashboard (agrégats, jamais de findMany massif). */
export async function getInventoryKpis(): Promise<InventoryKpis> {
  const [totalProducts, groups, units, outOfStockProducts] = await Promise.all([
    countActiveProducts(),
    groupStocksForKpis(),
    sumAllStocks(),
    countOutOfStockProducts(),
  ]);

  let lowStock = 0;
  for (const g of groups) {
    const available = g.quantity - g.reserved;
    if (available > 0 && available <= g.alertThreshold) {
      lowStock += g._count.variantId;
    }
  }

  return {
    totalProducts,
    // La projection est la source de vérité « produits en rupture » côté
    // storefront ; le groupBy sert au détail par VARIANTE.
    outOfStock: outOfStockProducts,
    lowStock,
    totalAvailableUnits: (units._sum.quantity ?? 0) - (units._sum.reserved ?? 0),
  };
}

/** Variantes sous le seuil d'alerte, pour la file de réapprovisionnement. */
export async function listLowStockVariants(limit = 50) {
  const rows = await readStocksBelowThreshold(limit);
  return rows.map((r) => ({
    variantId: r.variantId,
    sku: r.variant.sku,
    productId: r.variant.productId,
    productName: r.variant.product.name,
    available: r.quantity - r.reserved,
    alertThreshold: r.alertThreshold,
  }));
}
