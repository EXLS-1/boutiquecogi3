// lib/admin/shared/format.ts
// =============================================================================
// FORMATAGE ADMIN — Helpers SERVER-SAFE (aucun import client / store)
// =============================================================================
// CONVENTION DU DOMAINE (cf. lib/product-pricing/pricing.types.ts) :
//   • Colonnes `Int` du schéma  → montant en CENTIMES
//     (Order.subtotalAmount, ShippingMethod.price, Media.sizeBytes… )
//   • Colonnes `Decimal(10,2)`  → montant en UNITÉS MAJEURES (Product.basePrice)
//
// ⚠️ Ne JAMAIS passer un montant en centimes directement à formatCurrency() :
//    cela afficherait un montant 100× trop grand.
//    Utiliser formatCents() pour les Int, formatMajor() pour les Decimal.
//
// NB : lib/currency/price-format.ts porte la conversion USD→CDF mais est
// `"use client"` (store zustand) → inutilisable depuis un Server Component.

import type { Currency } from "@prisma/client";
import { formatCurrency } from "@/lib/utils/currency";
import {
  formatDateFR,
  formatDateTimeFR,
  formatRelativeDateFR,
} from "@/lib/utils/date";

export { formatDateFR, formatDateTimeFR, formatRelativeDateFR };

const EM_DASH = "—";

/** Convertit des centimes en unité majeure. `null` si la valeur est absente. */
export function centsToMajor(cents: number | null | undefined): number | null {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return null;
  }
  return cents / 100;
}

/**
 * Formate un montant stocké en CENTIMES (colonnes Int du schéma).
 * @param cents — Montant en centimes, ou null/undefined.
 */
export function formatCents(
  cents: number | null | undefined,
  currency: Currency = "USD",
): string {
  const major = centsToMajor(cents);
  if (major === null) return EM_DASH;
  return formatCurrency(major, { currency });
}

/**
 * Formate un montant déjà exprimé en UNITÉS MAJEURES
 * (colonnes Decimal normalisées à la lecture, ex. Product.basePrice).
 */
export function formatMajor(
  amount: number | string | null | undefined,
  currency: Currency = "USD",
): string {
  if (amount === null || amount === undefined) return EM_DASH;
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return EM_DASH;
  return formatCurrency(value, { currency });
}

/** Entier formaté à la française (ex. 12 500). */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** Pourcentage formaté (valeur déjà en % : 12.5 → « 12,5 % »). */
export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

/** Taille en octets → unité lisible (o / Ko / Mo / Go). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return EM_DASH;
  }
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go", "To"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1).replace(".", ",")} ${units[unitIndex]}`;
}

/** Durée en millisecondes → « 1,2 s » / « 340 ms » / « 4 min ». */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return EM_DASH;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0).replace(".", ",")} s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  return `${(ms / 3_600_000).toFixed(1).replace(".", ",")} h`;
}

/** Ratio borné 0–100 (évite division par zéro / NaN). */
export function toPercent(part: number, total: number, digits = 1): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return 0;
  const ratio = (part / total) * 100;
  return Number(ratio.toFixed(digits));
}

/**
 * Variation relative entre deux périodes, en %.
 * Retourne `null` quand la base de comparaison est nulle (variation
 * indéfinie : on n'affiche pas « +∞ % »).
 */
export function percentChange(
  current: number,
  previous: number,
): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

/** Libellé court jour/mois (ex. « 16/08 »). */
export function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

/** Clé de jour stable (YYYY-MM-DD) pour regrouper des séries temporelles. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const NOT_AVAILABLE = EM_DASH;