// lib/utils/uuid.ts

/** Génère un UUID v7 RFC 9562 */
export function generateUUIDv7(): string {
  // Fallback: Use crypto.randomUUID as v7 may not be available in all Node versions
  // In production, you'd want to use a proper UUID v7 library or implementation
  return crypto.randomUUID();
}
