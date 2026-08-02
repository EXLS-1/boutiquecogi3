// lib/utils/uuid.ts

import { randomUUIDv7 } from "node:crypto";

/**
 * Génère un UUID v7 RFC 9562.
 * Il est triable temporellement via l'API native.
 * Strictement optimisé pour l'utilisation comme clé primaire (ex: Prisma).
 */
export function generateUUIDv7(): string {
  return randomUUIDv7();
}
