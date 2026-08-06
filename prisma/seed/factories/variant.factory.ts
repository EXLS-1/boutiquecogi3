// prisma/seed/factories/variant.factory.ts
// ============================================
// GÉNÉRATEUR DE VARIANTES (SKUs, prix USD/CDF)
// ============================================

import { generateDeterministicUuidV7 } from "../utils/uuid";
import { usdToCents, usdCentsToCdf, centsToUsdString } from "../utils/currency";

export interface GeneratedVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  priceOffset: number;
  priceUSD: string; // cents -> string Decimal
  priceCDF: string; // francs -> string
}

export interface VariantOption {
  key: string;
  value: string;
}

/**
 * Construit une variante de produit avec prix USD/CDF précis (entiers).
 * `baseUsdCents` est le prix de base en cents ; `priceOffset` est en cents.
 */
export function buildVariantFactory(
  index: number,
  productId: string,
  baseUsdCents: number,
  options?: { option?: VariantOption; priceOffsetCents?: number; skuPrefix?: string },
): GeneratedVariant {
  const priceOffset = options?.priceOffsetCents ?? 0;
  const usdCents = baseUsdCents + priceOffset;
  const cdf = usdCentsToCdf(usdCents);

  const key = options?.option?.key ?? "default";
  const value = options?.option?.value ?? `Variante ${index}`;

  return {
    id: generateDeterministicUuidV7("variant", index),
    productId,
    sku: `${options?.skuPrefix ?? "SKU"}-${String(index + 1).padStart(4, "0")}`,
    attributes: { [key]: value },
    priceOffset,
    priceUSD: centsToUsdString(usdCents),
    priceCDF: String(cdf),
  };
}

/** Construit un lot de variantes pour un produit (2 par défaut). */
export function buildVariantsBatch(
  productIndex: number,
  productId: string,
  baseUsdCents: number,
  count = 2,
): GeneratedVariant[] {
  const pairs: Array<[string, string]> = [
    ["couleur", "Noir"],
    ["couleur", "Argent"],
    ["taille", "S"],
    ["taille", "M"],
    ["taille", "L"],
  ];
  const variants: GeneratedVariant[] = [];
  for (let i = 0; i < count; i++) {
    const [key, value] = pairs[i % pairs.length];
    const offset = i % 2 === 0 ? 0 : usdToCents(15);
    variants.push(
      buildVariantFactory(
        productIndex * 10 + i,
        productId,
        baseUsdCents,
        { option: { key, value }, priceOffsetCents: offset, skuPrefix: `SKU-${productIndex + 1}` },
      ),
    );
  }
  return variants;
}
