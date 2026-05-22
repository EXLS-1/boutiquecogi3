// /lib/safe-url.ts

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Vérifie si une URL est sûre.
 * - Autorise les URLs relatives
 * - Autorise uniquement certains protocoles
 * - Bloque javascript:, data:, vbscript:, etc.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim();

  if (!trimmed) {
    return false;
  }

  /**
   * URLs relatives autorisées
   * Exemple:
   * /contact
   * /products/123
   */
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);

    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Neutralise automatiquement les URLs invalides
 */
export function sanitizeUrl(url: string): string {
  return isSafeUrl(url) ? url.trim() : "#";
}
