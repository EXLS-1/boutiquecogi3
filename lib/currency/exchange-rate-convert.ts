// lib/currency/exchange-rate-convert.ts

import { DEFAULT_USD_TO_CDF_RATE } from "@/lib/currency/exchange-rate-constants";

export function usdToCdf(amount: number): number {
  return Math.round(amount * DEFAULT_USD_TO_CDF_RATE);
}

export function cdfToUsd(amount: number): number {
  return Math.round(amount / DEFAULT_USD_TO_CDF_RATE);
}

// --- Fonctions BULK (pour traiter des listes) ---

export function bulkUsdToCdf(amounts: number[]): number[] {
  return amounts.map((amount) => Math.round(amount * DEFAULT_USD_TO_CDF_RATE));
}

export function bulkCdfToUsd(amounts: number[]): number[] {
  return amounts.map((amount) => Math.round(amount / DEFAULT_USD_TO_CDF_RATE));
}
