// exchange-rate-service.ts

import { Prisma } from "@prisma/client";
import { fetchRate } from "./bcc-client";
import { saveLastValidRate, getLastValidRate } from "./exchange-rate-cache";
import { validateRate } from "./exchange-rate-validator";
import { ExchangeRate } from "./exchange-rate-types";
import { MEMORY_CACHE_TTL_MS } from "./exchange-rate-constants";

const FALLBACK_RATE: ExchangeRate = new Prisma.Decimal(
  process.env.FALLBACK_EXCHANGE_RATE || "2850",
);

/**
 * Cache interne en mémoire pour limiter les accès I/O.
 */
let memoryCache: { rate: ExchangeRate; timestamp: number } | null = null;

/**
 * Récupère le taux de change USD vers CDF selon la stratégie de repli à 4 niveaux.
 * Architecture : Mémoire (L1) ➔ BCC Actuel (L2) ➔ Cache DB (L3) ➔ Fallback .env (L4)
 */
export async function getUSDToCDFRate(): Promise<ExchangeRate> {
  const now = Date.now();

  // Étape 0 : Vérification du cache en mémoire (Performance maximale)
  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_TTL_MS) {
    return memoryCache.rate;
  }

  // Étape 1 : Tentative via la source officielle (BCC)
  const officialRate = await fetchRate();

  if (officialRate) {
    try {
      // Persistance obligatoire pour le prochain mode dégradé
      await saveLastValidRate(officialRate);
      console.log(
        `[EXCHANGE_SERVICE] Taux mis à jour depuis la BCC : ${officialRate} CDF`,
      );

      // Mise à jour du cache mémoire
      memoryCache = { rate: officialRate, timestamp: now };
      return officialRate;
    } catch {
      // Mise à jour du cache mémoire même si l'écriture en DB échoue
      memoryCache = { rate: officialRate, timestamp: now };
      return officialRate;
    }
  }

  console.warn(
    "[EXCHANGE_SERVICE] Source BCC indisponible ou invalide. Passage au cache base de données...",
  );

  // Étape 2 : Repli sur le dernier taux valide stocké en Base de données
  const cachedRate = await getLastValidRate();
  if (cachedRate && validateRate(cachedRate)) {
    console.log(
      `[EXCHANGE_SERVICE] Mode dégradé : Taux récupéré du cache DB : ${cachedRate} CDF`,
    );

    // On met en cache mémoire même le taux DB pour soulager la base
    memoryCache = { rate: cachedRate, timestamp: now };
    return cachedRate;
  }

  // Étape 3 : Fallback ultime si la base est vide ou inaccessible
  console.error(
    `[EXCHANGE_SERVICE] CRITIQUE : Cache indisponible. Application du fallback ENV : ${FALLBACK_RATE} CDF`,
  );

  // Note : On ne met pas forcément en cache mémoire le fallback pour forcer une nouvelle tentative au prochain appel
  return FALLBACK_RATE;
}

/**
 * Convertit de manière sécurisée et arrondie un montant USD en Francs Congolais (CDF).
 * @param amountInUSD Montant unitaire ou total en dollars.
 */
export async function convertUSDToCDF(
  amountInUSD: number,
): Promise<Prisma.Decimal> {
  if (amountInUSD <= 0) return new Prisma.Decimal(0);
  const rate = await getUSDToCDFRate();
  return rate
    .times(amountInUSD)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP); // Arrondi à l'entier le plus proche
}
