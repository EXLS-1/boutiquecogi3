// lib/currency/exchange-rate-cache.ts
// =============================================================================
// Persistance du taux de change en base de données (cache L3).
// Garantit la continuité de service en cas d'indisponibilité de la BCC.
// =============================================================================


import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CACHE_KEY } from "./exchange-rate-constants";
import { generateUUIDv7 } from "@/lib/utils/uuid";

export async function saveLastValidRate(rate: Prisma.Decimal): Promise<void> {
  const rateString = rate.toFixed();

  try {
    await prisma.systemConfiguration.upsert({
      where: { key: CACHE_KEY },
      update: {
        value: rateString,
        updatedAt: new Date(),
      },
      create: {
        id: generateUUIDv7(),
        key: CACHE_KEY,
        value: rateString,
      },
    });
  } catch (error) {
    console.error(
      "[EXCHANGE_RATE_CACHE_WRITE_ERROR] Impossible de persister le taux :",
      error,
    );
    throw error;
  }
}

/**
 * Récupère le dernier taux valide depuis la base de données.
 * @returns Le taux stocké ou `null` si aucun taux n'est disponible
 */
export async function getLastValidRate(): Promise<Prisma.Decimal | null> {
  try {
    const config = await prisma.systemConfiguration.findUnique({
      where: { key: CACHE_KEY },
    });

    if (!config?.value) return null;

    return new Prisma.Decimal(config.value);
  } catch (error) {
    console.error(
      "[EXCHANGE_RATE_CACHE_READ_ERROR] Erreur de lecture de la configuration :",
      error,
    );
    return null;
  }
}

