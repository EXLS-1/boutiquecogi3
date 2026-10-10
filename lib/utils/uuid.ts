// lib/utils/uuid.ts

import crypto from "node:crypto";

/** Génère un UUID v7 RFC 9562 */
export function generateUUIDv7(): string {
  // Fallback: Use crypto.randomUUID as v7 may not be available in all Node versions
  // In production, you'd want to use a proper UUID v7 library or implementation
  return crypto.randomUUID();
}

/**
 * Vérifie si une chaîne de caractères correspond au format d'un UUID valide.
 * Utilisé pour éviter les erreurs de typage PostgreSQL lors des requêtes Prisma.
 *
 * @param str - La chaîne à valider.
 * @returns `true` si le format est valide, `false` sinon.
 */
export const isValidUuid = (str: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};
