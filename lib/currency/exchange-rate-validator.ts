// lib/exchange-rate/exchange-rate-validator.ts
// Ce module fournit des fonctions de validation pour les taux de change USD/CDF.
// Il utilise Zod pour valider les taux individuels et une fonction personnalisée pour vérifier les variations entre deux taux.
// Les règles de validation sont les suivantes :
// 1. Le taux doit être un nombre décimal positif.
// 2. Le taux doit être compris entre 2100 et 3500 pour éviter les valeurs anormales.
// 3. La variation entre deux taux successifs ne doit pas dépasser 10% pour garantir la cohérence des données.

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { ExchangeRate } from "./exchange-rate-types";

export const exchangeRateSchema = z
  .instanceof(Prisma.Decimal)
  .refine((rate) => rate.greaterThan(0), {
    message: "Le taux de change doit être positif.",
  })
  .refine((rate) => rate.greaterThanOrEqualTo(2100), {
    message: "Le taux USD/CDF est anormalement bas (min 2100).",
  })
  // Cohérence : Le max doit obligatoirement être supérieur ou égal au FALLBACK_RATE (2850)
  .refine((rate) => rate.lessThanOrEqualTo(3500), {
    message: "Le taux USD/CDF est anormalement haut (max 3500).",
  });

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

export function validateRateVariation(
  previous: ExchangeRate,
  current: ExchangeRate,
): boolean {
  try {
    const variation = current.minus(previous).abs().div(previous);
    return variation.lessThanOrEqualTo(new Prisma.Decimal("0.1")); // Max 10% de fluctuation
  } catch {
    return false;
  }
}
