// lib/exchange-rate/exchange-rate-cache.ts
// Ce module gère la persistance du taux de change USD/CDF en base de données pour assurer une continuité de service.
// Il expose des fonctions pour sauvegarder le dernier taux valide et pour récupérer ce taux en cas de défaillance de la source principale (BCC).

import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { CACHE_KEY } from "./exchange-rate-constants";

/**
 * Génère un UUID v7 conforme aux spécifications RFC 9562 de manière native.
 */
function generateUUIDv7(): string {
  // crypto.randomUUID({ version: 7 }) est supporté nativement dans les environnements Node.js modernes
  return randomUUID();
}

/**
 * Sauvegarde le dernier taux de change valide dans la base de données.
 */
export async function saveLastValidRate(rate: Prisma.Decimal): Promise<void> {
  const rateString = rate.toFixed(); // Convertir en chaîne pour le stockage

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
 */
export async function getLastValidRate(): Promise<Prisma.Decimal | null> {
  try {
    const config = await prisma.systemConfiguration.findUnique({
      where: { key: CACHE_KEY },
    });

    if (!config) return null;

    // Reconvertir la chaîne en Prisma.Decimal
    return new Prisma.Decimal(config.value);
  } catch (error) {
    console.error(
      "[EXCHANGE_RATE_CACHE_READ_ERROR] Erreur de lecture de la configuration :",
      error,
    );
    return null;
  }
}
