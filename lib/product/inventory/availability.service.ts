// lib/product/inventory/availability.service.ts
// =============================================================================
// DISPONIBILITÉ — Lectures agrégées (KPI, badges, storefront)
// =============================================================================
// Règle : JAMAIS charger les mouvements pour calculer une statistique.
// On agrège en base (sum/groupBy/count), on ne ramène jamais de lignes.
// `available` est toujours DÉRIVÉ (quantity - reserved), jamais persisté.

import { prisma } from "@/lib/prisma";
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
  // findMany + take:1 plutôt que findUnique sur la clé composite, car
  // `warehouseId: null` n'est pas couvert par l'unicité PostgreSQL
  // (les NULL sont distincts dans un index unique).
  const row = await prisma.variantStock.findFirst({
    where: { variantId, warehouseId: warehouseId ?? null },
    select: {
      quantity: true,
      reserved: true,
      alertThreshold: true,
    },
  });

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
  const [aggregate, variants, projection] = await Promise.all([
    prisma.variantStock.aggregate({
      where: { variant: { productId } },
      _sum: { quantity: true, reserved: true },
    }),
    prisma.variantStock.findMany({
      where: { variant: { productId } },
      select: { quantity: true, reserved: true, alertThreshold: true },
    }),
    prisma.product_Availability_Projection.findUnique({
      where: { productId },
      select: { isAvailable: true },
    }),
  ]);

  const quantity = aggregate._sum.quantity ?? 0;
  const reserved = aggregate._sum.reserved ?? 0;

  return {
    quantity,
    reserved,
    available: quantity - reserved,
    variantCount: variants.length,
    outOfStockVariants: variants.filter(
      (v) => v.quantity - v.reserved <= 0,
    ).length,
    lowStockVariants: variants.filter(
      (v) => v.quantity - v.reserved > 0 && v.quantity - v.reserved <= v.alertThreshold,
    ).length,
    projectionIsAvailable: projection?.isAvailable ?? false,
  };
}

/** KPIs inventaire du dashboard (agrégats, jamais de findMany massif). */
export async function getInventoryKpis(): Promise<InventoryKpis> {
  const [totalProducts, groups, units, outOfStockProjection] = await Promise.all([
    prisma.product.count({ where: { isdeleted: false, isArchived: false } }),
    prisma.variantStock.groupBy({
      by: ["quantity", "reserved", "alertThreshold"],
      _count: { variantId: true },
    }),
    prisma.variantStock.aggregate({
      _sum: { quantity: true, reserved: true },
    }),
    prisma.product_Availability_Projection.count({ where: { isAvailable: false } }),
  ]);

  let outOfStock = 0;
  let lowStock = 0;
  for (const g of groups) {
    const available = g.quantity - g.reserved;
    const count = g._count.variantId;
    if (available <= 0) outOfStock += count;
    else if (available <= g.alertThreshold) lowStock += count;
  }

  return {
    totalProducts,
    // La projection est la source de vérité « produits en rupture » côté
    // storefront ; le groupBy sert au détail par VARIANTE.
    outOfStock: outOfStockProjection,
    lowStock,
    totalAvailableUnits: (units._sum.quantity ?? 0) - (units._sum.reserved ?? 0),
  };
}

/** Variantes sous le seuil d'alerte, pour la file de réapprovisionnement. */
export async function listLowStockVariants(limit = 50) {
  const rows = await prisma.variantStock.findMany({
    where: { quantity: { lte: prisma.variantStock.fields.alertThreshold } },
    take: limit,
    orderBy: { quantity: "asc" },
    select: {
      variantId: true,
      quantity: true,
      reserved: true,
      alertThreshold: true,
      variant: { select: { sku: true, productId: true, product: { select: { name: true } } } },
    },
  });

  return rows.map((r) => ({
    variantId: r.variantId,
    sku: r.variant.sku,
    productId: r.variant.productId,
    productName: r.variant.product.name,
    available: r.quantity - r.reserved,
    alertThreshold: r.alertThreshold,
  }));
}
