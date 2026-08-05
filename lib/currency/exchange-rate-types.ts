// lib/exchange-rate/exchange-rate-types.ts
// =============================================================================
// Types TypeScript stricts pour le module de taux de change.
// =============================================================================

import { Prisma, Currency } from "@prisma/client";

/** Représente un taux de change USD/CDF validé (Prisma.Decimal). */
export type ExchangeRate = Prisma.Decimal;

/** Représente une devise d'affichage supportée (aligné sur l'enum Prisma). */
export type DisplayCurrency = Currency;

/** Métadonnées associées à une devise. */
export interface CurrencyMetadata {
  readonly code: DisplayCurrency;
  readonly symbol: string;
  readonly label: string;
  readonly locale: string;
  readonly precision: number;
}

/** Réponse standardisée de l'API de taux de change. */
export interface ExchangeRateApiResponse {
  readonly success: boolean;
  readonly rate?: string;
  readonly currency?: string;
  readonly base?: string;
  readonly timestamp?: string;
  readonly error?: { readonly code: string; readonly message: string };
}

/** Niveaux de cache pour la stratégie de résilience. */
export enum CacheLevel {
  L1_MEMORY = "L1_MEMORY",
  L2_SCRAPER = "L2_SCRAPER",
  L3_DATABASE = "L3_DATABASE",
  L4_FALLBACK = "L4_FALLBACK",
}

/** Entrée de cache mémoire L1. */
export interface MemoryCacheEntry {
  readonly rate: ExchangeRate;
  readonly timestamp: number;
  readonly level: CacheLevel;
}
