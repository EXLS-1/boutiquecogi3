// lib/exchange-rate/exchange-rate-cache.ts
// =============================================================================
// Persistance du taux de change en base de données (cache L3).
// Garantit la continuité de service en cas d'indisponibilité de la BCC.
// =============================================================================


import { Prisma } from "@prisma/client";
import { CACHE_KEY } from "../currency/exchange-rate-constants";

// ─── Lazy import de Prisma pour éviter les cycles de dépendance ───────────────

let _prisma: typeof import("@/lib/prisma").prisma | null = null;

function getPrisma() {
  if (!_prisma) {
    _prisma = require("@/lib/prisma").prisma;
  }
  return _prisma;
}

// ─── Génération UUID v7 (RFC 9562) ────────────────────────────────────────────

/**
 * Génère un UUID v7 chronologiquement triable (Node.js 22+).
 * Optimise les index de base de données pour les clés primaires.
 */
export function generateUUIDv7(): string {
  const { randomUUID } = require("crypto");
  // @ts-expect-error — Supporté nativement dans les runtimes modernes (Node 22+)
  return randomUUID({ version: 7 });
}

// ─── Opérations de cache ────────────────────────────────────────────────────

/**
 * Sauvegarde le dernier taux de change valide en base de données.
 * Utilise upsert pour garantir l'atomicité de l'opération.
 * @param rate - Taux à persister
 * @throws Error si l'écriture en base échoue
 */
export async function saveLastValidRate(rate: Prisma.Decimal): Promise<void> {
  const prisma = getPrisma();
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
  const prisma = getPrisma();

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
