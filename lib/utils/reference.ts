// lib/utils/reference.ts

import { webcrypto } from "node:crypto";

/**
 * GÃ©nÃ¨re une rÃ©fÃ©rence de commande lisible par l'humain, sans ambiguÃ¯tÃ© visuelle
 * (exclusion des caractÃ¨res O, 0, I, 1) et sÃ©curisÃ©e contre la prÃ©dictibilitÃ©.
 * Format: CMD-2026-X8K9L
 */
export function generateOrderReference(prefix: string = "CMD"): string {
  const year = new Date().getFullYear();
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 caractÃ¨res non ambiguÃ«s
  const length = 5;

  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : webcrypto;

  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues ?? window.crypto?.getRandomValues(bytes);

  let randomCode = "";
  for (let i = 0; i < length; i++) {
    randomCode += alphabet[bytes[i] % alphabet.length];
  }

  return `${prefix.toUpperCase()}-${year}-${randomCode}`;
}
