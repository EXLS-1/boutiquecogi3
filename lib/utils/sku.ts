// lib/utils/sku.ts

import { webcrypto } from "node:crypto";

export interface SKUOptions {
  prefixLength?: number;
  entropyLength?: number;
  fallbackPrefix?: string;
}

/**
 * Génère un suffixe pseudo-aléatoire hautement résistant aux collisions via Web Crypto API.
 */
function getRandomBase36(length: number): string {
  const cryptoObj: Crypto =
    typeof window !== "undefined" && window.crypto
      ? (window.crypto as Crypto)
      : (webcrypto as unknown as Crypto);

  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);

  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

/**
 * Génère un SKU robuste, gérant la normalisation Unicode et l'entropie cryptographique.
 */
export function generateSKU(name: string, options: SKUOptions = {}): string {
  const {
    prefixLength = 6,
    entropyLength = 5,
    fallbackPrefix = "PROD",
  } = options;

  const normalized = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Suppression des diacritiques
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const prefix = (normalized.length > 0 ? normalized : fallbackPrefix).slice(0, prefixLength);
  const suffix = getRandomBase36(entropyLength);

  return `${prefix}-${suffix}`;
}