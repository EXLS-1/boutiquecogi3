// lib/exchange-rate/exchange-rate-service.ts
// Ce module centralise la logique de récupération et de validation du taux de change USD/CDF.
// Il implémente une stratégie de résilience à 4 niveaux : Cache mémoire, Scraper officiel, Cache DB, Fallback d'urgence.
// La fonction convertUSDToCDF utilise le taux récupéré pour convertir un montant USD en CDF avec un arrondi intelligent.

import { Prisma } from "@prisma/client";
import { fetchRate } from "./bcc-client"; // CORRECTION : Importation du vrai client de scraping
import { saveLastValidRate, getLastValidRate } from "./exchange-rate-cache";
import { validateRate } from "./exchange-rate-validator";
import { ExchangeRate } from "./exchange-rate-types";
import { MEMORY_CACHE_TTL_MS } from "./exchange-rate-constants";

const FALLBACK_RATE: ExchangeRate = new Prisma.Decimal(
  process.env.FALLBACK_EXCHANGE_RATE || "2850",
);

let memoryCache: { rate: ExchangeRate; timestamp: number } | null = null;

/**
 * Récupère le taux selon la stratégie de résilience à 4 niveaux.
 * L1 (Mémoire) -> L2 (Scraper BCC Actuel) -> L3 (Cache DB) -> L4 (Fallback Configuration)
 */
export async function getUSDToCDFRate(): Promise<ExchangeRate> {
  const now = Date.now();

  // Étape 0 : Cache mémoire (L1)
  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_TTL_MS) {
    return memoryCache.rate;
  }

  // Étape 1 : Appel du Scraper Officiel (L2)
  const officialRate = await fetchRate();

  if (officialRate) {
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
    memoryCache = { rate: officialRate, timestamp: now };
    return officialRate;
  }

  console.warn(
    "[EXCHANGE_SERVICE] Source BCC indisponible. Rabattement sur le cache DB...",
  );

  // Étape 2 : Cache Base de données (L3)
  const cachedRate = await getLastValidRate();
  if (cachedRate && validateRate(cachedRate)) {
    console.log(
      `[EXCHANGE_SERVICE] Mode dégradé (L3 DB utilisé) : ${cachedRate.toFixed()} CDF`,
    );
    memoryCache = { rate: cachedRate, timestamp: now };
    return cachedRate;
  }

  // Étape 3 : Fallback d'urgence environnement (L4)
  console.error(
    `[EXCHANGE_SERVICE] ALERTE CRITIQUE : Panne système globale. Application du Fallback : ${FALLBACK_RATE.toFixed()} CDF`,
  );
  return FALLBACK_RATE;
}

/**
 * Convertit et arrondit un montant USD en Francs Congolais (CDF).
 */
export async function convertUSDToCDF(
  amountInUSD: number,
): Promise<Prisma.Decimal> {
  if (amountInUSD <= 0) return new Prisma.Decimal(0);
  const rate = await getUSDToCDFRate();
  return rate
    .times(amountInUSD)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
}
/**
 * Force le rafraîchissement du taux depuis la BCC et met à jour les caches (DB et Mémoire).
 * Conçu spécifiquement pour être invoqué par le job CRON.
 */
export async function forceRefreshExchangeRate(): Promise<ExchangeRate | null> {
  const now = Date.now();
  const officialRate = await fetchRate();

  if (officialRate) {
    try {
      await saveLastValidRate(officialRate);
      memoryCache = { rate: officialRate, timestamp: now };
      return officialRate;
    } catch (error) {
      console.error(
        "[EXCHANGE_SERVICE] Échec d'écriture DB lors du rafraîchissement forcé",
        error,
      );
      // On met quand même à jour la mémoire locale au cas où
      memoryCache = { rate: officialRate, timestamp: now };
      return officialRate;
    }
  }
  return null;
}

/**
 * Récupération ultra-rapide du taux pour les requêtes publiques.
 * Parcourt uniquement les caches sans jamais initier de scraping synchrone.
 * Architecture de lecture seule : Mémoire (L1) ➔ Cache DB (L3) ➔ Fallback .env (L4)
 */
export async function getFastUSDToCDFRate(): Promise<ExchangeRate> {
  const now = Date.now();

  // 1. Vérification de la mémoire locale (L1)
  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_TTL_MS) {
    return memoryCache.rate;
  }

  // 2. Repli immédiat sur la Base de données (L3) - Pas d'appel BCC ici !
  const cachedRate = await getLastValidRate();
  if (cachedRate && validateRate(cachedRate)) {
    // Réapprovisionnement de la mémoire locale pour les requêtes suivantes
    memoryCache = { rate: cachedRate, timestamp: now };
    return cachedRate;
  }

  // 3. Fallback ultime si la DB est inaccessible ou vide (L4)
  return FALLBACK_RATE;
}
