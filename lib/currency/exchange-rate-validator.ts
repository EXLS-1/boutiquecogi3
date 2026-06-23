// lib/exchange-rate/exchange-rate-validator.ts
// =============================================================================
// Validation robuste des taux de change avec Zod.
// Règles : positif, borné [2100-3500], variation max 10% entre taux.
// =============================================================================

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ExchangeRate } from "./exchange-rate-types";
import {
  RATE_BOUNDS,
  MAX_VARIATION_THRESHOLD,
} from "../currency/exchange-rate-constants";

// ─── Schéma Zod pour validation runtime ─────────────────────────────────────

export const exchangeRateSchema = z
  .instanceof(Prisma.Decimal)
  .refine((rate) => rate.greaterThan(0), {
    message: "Le taux de change doit être strictement positif.",
  })
  .refine((rate) => rate.greaterThanOrEqualTo(RATE_BOUNDS.MIN), {
    message: `Le taux USD/CDF est anormalement bas (min ${RATE_BOUNDS.MIN}).`,
  })
  .refine((rate) => rate.lessThanOrEqualTo(RATE_BOUNDS.MAX), {
    message: `Le taux USD/CDF est anormalement haut (max ${RATE_BOUNDS.MAX}).`,
  });

// ─── Fonctions de validation ────────────────────────────────────────────────

/**
 * Valide qu'une valeur est un taux de change acceptable.
 * @param rate - Valeur à valider
 * @returns `true` si le taux est valide, `false` sinon
 */
export function validateRate(rate: unknown): rate is ExchangeRate {
  const result = exchangeRateSchema.safeParse(rate);
  if (!result.success) {
    console.warn(
      "[EXCHANGE_RATE_VALIDATOR] Échec de validation :",
      result.error.format(),
    );
    return false;
  }
  return true;
}

/**
 * Valide que la variation entre deux taux successifs ne dépasse pas le seuil.
 * @param previous - Taux précédent
 * @param current - Taux actuel
 * @returns `true` si la variation est acceptable, `false` sinon
 */
export function validateRateVariation(
  previous: ExchangeRate,
  current: ExchangeRate,
): boolean {
  try {
    if (previous.equals(0)) return false;
    const variation = current.minus(previous).abs().div(previous.abs());
    return variation.lessThanOrEqualTo(
      new Prisma.Decimal(MAX_VARIATION_THRESHOLD.toString()),
    );
  } catch {
    return false;
  }
}

/**
 * Valide un taux numérique brut (avant conversion Prisma.Decimal).
 * @param rawValue - Valeur numérique brute
 * @returns `true` si la valeur est dans les bornes acceptables
 */
export function validateRawRate(rawValue: number): boolean {
  return (
    Number.isFinite(rawValue) &&
    rawValue > 0 &&
    rawValue >= RATE_BOUNDS.MIN &&
    rawValue <= RATE_BOUNDS.MAX
  );
}
