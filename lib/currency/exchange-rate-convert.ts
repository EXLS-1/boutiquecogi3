// lib/currency/exchange-rate-convert.ts
// =============================================================================
// Fonctions de conversion synchrone USD ↔ CDF avec taux par défaut.
// Pour les conversions en temps réel, utiliser exchange-rate-service.ts
// =============================================================================

import { DEFAULT_USD_TO_CDF_RATE } from "./exchange-rate-constants";

// ─── Conversions unitaires ────────────────────────────────────────────────────

/**
 * Convertit un montant USD en CDF (taux par défaut).
 * @param amount - Montant en USD
 * @returns Montant en CDF arrondi à l'unité
 */
export function usdToCdf(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * DEFAULT_USD_TO_CDF_RATE);
}

/**
 * Convertit un montant CDF en USD (taux par défaut).
 * @param amount - Montant en CDF
 * @returns Montant en USD arrondi à l'unité
 */
export function cdfToUsd(amount: number): number {
  if (!Number.isFinite(amount) || amount === 0) return 0;
  return Math.round(amount / DEFAULT_USD_TO_CDF_RATE);
}

// ─── Conversions en bulk ──────────────────────────────────────────────────────

/**
 * Convertit une liste de montants USD en CDF.
 * @param amounts - Tableau de montants en USD
 * @returns Tableau de montants en CDF
 */
export function bulkUsdToCdf(amounts: number[]): number[] {
  return amounts.map((amount) => usdToCdf(amount));
}

/**
 * Convertit une liste de montants CDF en USD.
 * @param amounts - Tableau de montants en CDF
 * @returns Tableau de montants en USD
 */
export function bulkCdfToUsd(amounts: number[]): number[] {
  return amounts.map((amount) => cdfToUsd(amount));
}
