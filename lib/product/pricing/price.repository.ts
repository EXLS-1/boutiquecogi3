// lib/product/pricing/price.repository.ts
// =============================================================================
// PRICING — REPOSITORY (seul point d'accès à Prisma dans ce module)
// =============================================================================
// RÈGLE : aucun import de Prisma ailleurs que dans un `*.repository.ts`.
// Ce fichier ne contient AUCUNE logique métier : il traduit des
// `SetPriceInput` (centimes) en lignes `ProductPrice` (Decimal) et inversement.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MoneyCents, PriceableProduct, SetPriceInput } from "./price.types";

/** Decimal(10,2) ↔ centimes. Le domaine ne manipule QUE des centimes. */
export function centsToDecimal(cents: MoneyCents): Prisma.Decimal {
  return new Prisma.Decimal(cents).div(100);
}

export function decimalToCents(value: Prisma.Decimal | number | string): MoneyCents {
  if (value instanceof Prisma.Decimal) return Math.round(value.toNumber() * 100);
  if (typeof value === "string") return Math.round(parseFloat(value) * 100);
  return Math.round(value * 100);
}

/**
 * Charge un produit AVEC ses couches de prix, minimisé sur ce dont la
 * résolution a besoin. `include` explicite plutôt que `true` : la couche
 * Repository est aussi le garde-fou contre les over-fetchings.
 */
export async function findPriceableProduct(
  productId: string,
): Promise<PriceableProduct | null> {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      productPrices: {
        select: {
          currency: true,
          amount: true,
          compareAtPrice: true,
          country: true,
          region: true,
          startsAt: true,
          endsAt: true,
        },
      },
      catalogs: {
        select: {
          catalogId: true,
          priceOverride: true,
          isActive: true,
        },
      },
    },
  });
}

/** Prix + produit porteur, pour le contrôle d'appartenance avant mutation. */
export async function findPriceById(priceId: string) {
  return prisma.productPrice.findUnique({
    where: { id: priceId },
    select: {
      id: true,
      productId: true,
      currency: true,
      amount: true,
      compareAtPrice: true,
      country: true,
      region: true,
      startsAt: true,
      endsAt: true,
      product: { select: { id: true, name: true, sku: true } },
    },
  });
}

export async function createPrice(input: SetPriceInput) {
  return prisma.productPrice.create({
    data: {
      productId: input.productId,
      currency: input.currency,
      amount: centsToDecimal(input.amount),
      // compareAtPrice est un Int? dans le schéma : DÉJÀ en centimes.
      compareAtPrice: input.compareAtPrice ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
    },
  });
}

export async function updatePriceById(
  priceId: string,
  input: Partial<Omit<SetPriceInput, "productId">>,
) {
  return prisma.productPrice.update({
    where: { id: priceId },
    data: {
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.amount !== undefined && { amount: centsToDecimal(input.amount) }),
      ...(input.compareAtPrice !== undefined && {
        // Int? dans le schéma : déjà en centimes, pas de conversion.
        compareAtPrice: input.compareAtPrice,
      }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.region !== undefined && { region: input.region }),
      ...(input.startsAt !== undefined && { startsAt: input.startsAt }),
      ...(input.endsAt !== undefined && { endsAt: input.endsAt }),
    },
  });
}

export async function deletePriceById(priceId: string) {
  return prisma.productPrice.delete({ where: { id: priceId } });
}

/** Prix enregistrés d'un produit, du plus récent au plus ancien. */
export async function listPricesForProduct(productId: string) {
  return prisma.productPrice.findMany({
    where: { productId },
    orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Surcharge de prix d'un produit dans un catalogue donné
 * (CatalogProduct.priceOverride), ou null si aucune.
 */
export async function findCatalogPriceOverride(
  catalogId: string,
  productId: string,
) {
  return prisma.catalogProduct.findUnique({
    where: { catalogId_productId: { catalogId, productId } },
    select: { priceOverride: true, isActive: true },
  });
}

export async function setCatalogPriceOverride(
  catalogId: string,
  productId: string,
  priceOverride: MoneyCents | null,
) {
  return prisma.catalogProduct.upsert({
    where: { catalogId_productId: { catalogId, productId } },
    create: {
      catalogId,
      productId,
      priceOverride:
        priceOverride == null ? null : centsToDecimal(priceOverride),
    },
    update: {
      priceOverride:
        priceOverride == null ? null : centsToDecimal(priceOverride),
    },
    select: { catalogId: true, productId: true, priceOverride: true },
  });
}

/** Variantes transaction-compatible pour les écritures groupées. */
export type PricingTx = Prisma.TransactionClient;
