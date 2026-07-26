import { randomUUIDv7 } from "node:crypto";

/**
 * Génère un UUID v7 RFC 9562.
 */
export function generateUUIDv7(): string {
  return randomUUIDv7();
}
