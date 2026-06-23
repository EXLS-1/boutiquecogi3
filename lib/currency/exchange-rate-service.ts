// lib/currency/exchange-rate-service.ts
"use server";

import {
  getLastValidRate,
  saveLastValidRate,
} from "./exchange-rate-cache";
import { Prisma } from "@prisma/client";

const BCC_API_URL = "https://www.bcc.cd/..."; // Votre endpoint BCC
const DEFAULT_RATE = new Prisma.Decimal(2800); // Fallback conservateur

/**
 * Récupère le taux depuis le cache DB (lecture < 50ms).
 * Ne fait JAMAIS d'appel réseau.
 */
export async function getFastUSDToCDFRate(): Promise<Prisma.Decimal> {
  const cached = await getLastValidRate();
  if (cached) return cached;

  console.warn("[EXCHANGE_RATE_SERVICE] Cache vide — fallback défaut utilisé");
  return DEFAULT_RATE;
}

/**
 * Force un refresh depuis la BCC, puis persiste en DB.
 * Réservé aux ADMIN+ (appelé via /api/exchange-rate?refresh=true).
 */
export async function forceRefreshExchangeRate(): Promise<Prisma.Decimal | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(BCC_API_URL, {
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`BCC HTTP ${res.status}`);

    const data = await res.json();
    const rate = extractRateFromBCC(data); // Votre logique de parsing

    if (!rate || rate.lessThanOrEqualTo(0)) {
      throw new Error("Taux BCC invalide");
    }

    await saveLastValidRate(rate);
    return rate;
  } catch (error) {
    console.error("[EXCHANGE_RATE_REFRESH_ERROR]", error);
    return null;
  }
}

// Adapter selon le format réel de la BCC
function extractRateFromBCC(data: unknown): Prisma.Decimal | null {
  // Exemple : data = { usd_cdf: 2810.50 }
  if (typeof data === "object" && data !== null) {
    const rate = (data as Record<string, unknown>)?.usd_cdf;
    if (typeof rate === "number" || typeof rate === "string") {
      return new Prisma.Decimal(rate);
    }
  }
  return null;
}