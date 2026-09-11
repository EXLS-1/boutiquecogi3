// lib/product-inventory/inventory.read.ts
// =============================================================================
// INVENTAIRE PRODUIT — Lectures (disponibilité, alertes, KPIs)
// =============================================================================
// Lectures agées — JAMAIS de chargement complet des mouvements dans Prisma
// pour calculer une stat (ProductView/StockMovement peuvent être volumineux).

import { prisma } from "@/lib/prisma";
import type { InventoryAvailability } from "./inventory.types";

/** Disponibilité d'une variante (couche canonique VariantStock). */
export async function getVariantAvailability(
  variantId: string,
  warehouse?: string | null
): Promise<InventoryAvailability | null> {
  const vs = await prisma.variantStock.findUnique({
    where: { variantId_warehouse: { variantId, warehouse: warehouse ?? null } },
  });

  if (!vs) return null;

  const available = vs.quantity - vs.reserved;
  return {
    variantId,
    quantity: vs.quantity,
    reserved: vs.reserved,
    available,
    alertThreshold: vs.alertThreshold,
    isLow: available <= vs.alertThreshold,
    isOutOfStock: available <= 0,
  };
}

/** Disponibilité agrégée d'un produit (somme des variantes, projection incluse). */
export async function getProductAvailability(
  productId: string
): Promise<{
  quantity: number;
  reserved: number;
  available: number;
  variantCount: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  projectionIsAvailable: boolean;
}> {
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
  const available = quantity - reserved;

  return {
    quantity,
    reserved,
    available,
    variantCount: variants.length,
    outOfStockVariants: variants.filter((v) => v.quantity - v.reserved <= 0)
      .length,
    lowStockVariants: variants.filter(
      (v) => v.quantity - v.reserved <= v.alertThreshold
    ).length,
    projectionIsAvailable: projection?.isAvailable ?? false,
  };
}

/** KPIs dashboard produits (requêtes agrégées — pas de findMany massif). */
export async function getInventoryKpis(): Promise<{
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  totalAvailableUnits: number;
}> {
  const [totalProducts, availabilityGroups, units] = await Promise.all([
    prisma.product.count({ where: { isdeleted: false, isArchived: false } }),
    prisma.variantStock.groupBy({
      by: ["quantity", "reserved", "alertThreshold"],
      _count: { variantId: true },
    }),
    prisma.variantStock.aggregate({
      _sum: { quantity: true, reserved: true },
    }),
  ]);

  let outOfStock = 0;
  let lowStock = 0;

  for (const g of availabilityGroups) {
    const available = g.quantity - g.reserved;
    const count = g._count.variantId;
    if (available <= 0) outOfStock += count;
    else if (available <= g.alertThreshold) lowStock += count;
  }

  return {
    totalProducts,
    outOfStock,
    lowStock,
    totalAvailableUnits: (units._sum.quantity ?? 0) - (units._sum.reserved ?? 0),
  };
}
