// lib/exchange-rate/exchange-rate-validator.ts
// Ce module définit un schéma de validation strict pour le taux de change USD/CDF.
// Il utilise Zod pour s'assurer que les taux extraits sont réalistes et conformes aux attentes du marché.
// Les protections incluent des limites minimales et maximales pour éviter les valeurs aberrantes (ex: inversion de devises ou erreurs de virgule).
// En cas d'échec de validation, il logue un avertissement détaillé pour faciliter le debugging.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ExchangeRate } from "./exchange-rate-types";

/**
 * Schéma de validation strict pour le taux USD/CDF.
 * Protections contre les valeurs aberrantes (ex: inversion de devises ou erreurs de virgule).
 */
export const exchangeRateSchema = z
  .instanceof(Prisma.Decimal)
  .refine((rate) => rate.greaterThan(0), {
    message: "Le taux de change doit être positif.",
  })
  .refine((rate) => rate.greaterThanOrEqualTo(2000), {
    message:
      "Le taux USD/CDF est anormalement bas pour le marché actuel (min 2000).",
  })
  .refine((rate) => rate.lessThanOrEqualTo(4000), {
    message:
      "Le taux USD/CDF est anormalement haut pour le marché actuel (max 4000).",
  });

/**
 * Type guard pour valider la conformité d'un taux de change.
 */
export function validateRate(rate: unknown): rate is ExchangeRate {
  const result = exchangeRateSchema.safeParse(rate);
  if (!result.success) {
    console.warn(
      "[EXCHANGE_RATE_VALIDATOR] Échec de validation du taux :",
      result.error.format(),
    );
    return false;
  }
  return true;
}
