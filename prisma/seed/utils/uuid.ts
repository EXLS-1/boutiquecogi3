// prisma/seed/utils/uuid.ts
// ============================================
// UUIDS V7 DÉTERMINISTES (RFC 9562)
// ============================================
// Contrairement à un UUID v4 aléatoire, le UUID v7 intègre un
// horodatage de 48 bits suivi de bits pseudo-aléatoires. Pour garantir
// la répétabilité exacte des tests et du seed tout en conservant la
// triabilité séquentielle en B-Tree PostgreSQL, on dérive les bits
// depuis un hash SHA-256 du namespace + index.

import { createHash, randomUUIDv7 } from "node:crypto";

/** Base temporelle fixe pour que les UUIDS déterministes restent triables. */
const BASE_TIMESTAMP_MS = 1775000000000;

/**
 * Génère un UUID v7 100% déterministe basé sur un namespace et un index.
 * Respecte la spécification RFC 9562 (Version 7, Variant RFC 4122).
 */
export function generateDeterministicUuidV7(
  namespace: string,
  index: number,
  baseTimestampMs = BASE_TIMESTAMP_MS,
): string {
  const hash = createHash("sha256")
    .update(`${namespace}:${index}`)
    .digest();

  // 48-bit timestamp maintenu dans le futur (base fixe + index mineur)
  const timestamp = baseTimestampMs + index;
  const timeHex = timestamp.toString(16).padStart(12, "0");

  // rand_a : 12 bits pseudo-aléatoires
  const randA = (hash.readUInt16BE(0) & 0x0fff).toString(16).padStart(3, "0");

  // Version 7
  const ver = "7";

  // Variant RFC 4122 (0x8/0x9/0xa/0xb)
  const variantDigit = ((hash[2] & 0x3f) | 0x80).toString(16).substring(0, 1);

  const randB1 = hash.subarray(3, 5).toString("hex");
  const randB2 = hash.subarray(5, 11).toString("hex");

  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${ver}${randA}-${variantDigit}${randB1.slice(1)}-${randB2}`;
}

/** Alias : UUID v7 natif (non déterministe) pour les données du prod. */
export function generateUUIDv7(): string {
  return randomUUIDv7();
}
