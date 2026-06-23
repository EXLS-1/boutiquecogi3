// lib/exchange-rate/exchange-rate-service.ts
// =============================================================================
// Service central de taux de change USD/CDF avec stratégie de résilience 4 niveaux.
// L1 (Mémoire) → L2 (Scraper BCC) → L3 (Cache DB) → L4 (Fallback .env)
// =============================================================================

import { Prisma } from "@prisma/client";
import { fetchRate } from "../currency/exchange-rate-bcc";
import { saveLastValidRate, getLastValidRate } from "./exchange-rate-cache";
import { validateRate } from "./exchange-rate-validator";
import {
  ExchangeRate,
  MemoryCacheEntry,
  CacheLevel,
} from "./exchange-rate-types";
import {
  MEMORY_CACHE_TTL_MS,
  FALLBACK_EXCHANGE_RATE,
} from "../currency/exchange-rate-constants";

// ─── Fallback d'urgence ─────────────────────────────────────────────────────

const FALLBACK_RATE: ExchangeRate = new Prisma.Decimal(
  FALLBACK_EXCHANGE_RATE.toString(),
);

// ─── Cache mémoire L1 (module-level singleton) ────────────────────────────────

let memoryCache: MemoryCacheEntry | null = null;

// ─── Fonctions utilitaires ────────────────────────────────────────────────────

function isCacheValid(entry: MemoryCacheEntry | null): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < MEMORY_CACHE_TTL_MS;
}

function setMemoryCache(rate: ExchangeRate, level: CacheLevel): void {
  memoryCache = { rate, timestamp: Date.now(), level };
}

// ─── Service principal : récupération du taux ─────────────────────────────────

/**
 * Récupère le taux USD/CDF selon la stratégie de résilience à 4 niveaux.
 * L1 (Mémoire) → L2 (Scraper BCC) → L3 (Cache DB) → L4 (Fallback .env)
 * @returns Taux de change validé
 */
export async function getUSDToCDFRate(): Promise<ExchangeRate> {
  const now = Date.now();

  // ── Étape 0 : Cache mémoire L1 ───────────────────────────────────────────
  if (memoryCache && isCacheValid(memoryCache)) {
    return memoryCache.rate;
  }

  // ── Étape 1 : Scraper officiel BCC (L2) ──────────────────────────────────
  const officialRate = await fetchRate();

  if (officialRate && validateRate(officialRate)) {
    try {
      await saveLastValidRate(officialRate);
      console.log(
        `[EXCHANGE_SERVICE] Taux mis à jour depuis la BCC : ${officialRate.toFixed()} CDF`,
      );
    } catch (error) {
      console.error(
        "[EXCHANGE_SERVICE] Échec d'écriture du cache DB, poursuite sur mémoire.",
        error,
      );
    }
    setMemoryCache(officialRate, CacheLevel.L2_SCRAPER);
    return officialRate;
  }

  console.warn(
    "[EXCHANGE_SERVICE] Source BCC indisponible. Rabattement sur le cache DB...",
  );

  // ── Étape 2 : Cache base de données L3 ───────────────────────────────────
  const cachedRate = await getLastValidRate();
  if (cachedRate && validateRate(cachedRate)) {
    console.log(
      `[EXCHANGE_SERVICE] Mode dégradé (L3 DB utilisé) : ${cachedRate.toFixed()} CDF`,
    );
    setMemoryCache(cachedRate, CacheLevel.L3_DATABASE);
    return cachedRate;
  }

  // ── Étape 3 : Fallback d'urgence L4 ─────────────────────────────────────
  console.error(
    `[EXCHANGE_SERVICE] ALERTE CRITIQUE : Panne système globale. Fallback appliqué : ${FALLBACK_RATE.toFixed()} CDF`,
  );
  return FALLBACK_RATE;
}

/**
 * Convertit un montant USD en Francs Congolais (CDF) avec arrondi intelligent.
 * @param amountInUSD - Montant en USD
 * @returns Montant en CDF arrondi à l'unité
 */
export async function convertUSDToCDF(
  amountInUSD: number,
): Promise<Prisma.Decimal> {
  if (!Number.isFinite(amountInUSD) || amountInUSD <= 0) {
    return new Prisma.Decimal(0);
  }
  const rate = await getUSDToCDFRate();
  return rate
    .times(amountInUSD)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}

// ─── Rafraîchissement forcé (CRON) ──────────────────────────────────────────

/**
 * Force le rafraîchissement du taux depuis la BCC.
 * Met à jour les caches DB et mémoire. Conçu pour être invoqué par un job CRON.
 * @returns Le nouveau taux ou `null` en cas d'échec
 */
export async function forceRefreshExchangeRate(): Promise<ExchangeRate | null> {
  const officialRate = await fetchRate();

  if (officialRate && validateRate(officialRate)) {
    try {
      await saveLastValidRate(officialRate);
      setMemoryCache(officialRate, CacheLevel.L2_SCRAPER);
      return officialRate;
    } catch (error) {
      console.error(
        "[EXCHANGE_SERVICE] Échec d'écriture DB lors du rafraîchissement forcé",
        error,
      );
      // Mise à jour mémoire même si DB indisponible
      setMemoryCache(officialRate, CacheLevel.L2_SCRAPER);
      return officialRate;
    }
  }

  return null;
}

// ─── Lecture ultra-rapide (API publique) ──────────────────────────────────────

/**
 * Récupération ultra-rapide du taux pour les requêtes publiques.
 * Parcourt uniquement les caches sans jamais initier de scraping synchrone.
 * Architecture lecture seule : Mémoire (L1) → DB (L3) → Fallback (L4)
 * @returns Taux de change depuis le cache le plus récent disponible
 */
export async function getFastUSDToCDFRate(): Promise<ExchangeRate> {
  // 1. Vérification mémoire locale L1
  if (memoryCache && isCacheValid(memoryCache)) {
    return memoryCache.rate;
  }

  // 2. Repli immédiat sur la base de données L3
  const cachedRate = await getLastValidRate();
  if (cachedRate && validateRate(cachedRate)) {
    setMemoryCache(cachedRate, CacheLevel.L3_DATABASE);
    return cachedRate;
  }

  // 3. Fallback ultime L4
  return FALLBACK_RATE;
}
