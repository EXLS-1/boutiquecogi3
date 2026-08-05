// lib/utils/reference.ts

import { webcrypto } from "node:crypto";

/**
 * Génère une référence de commande lisible par l'humain, sans ambiguïté visuelle
 * (exclusion des caractères O, 0, I, 1) et sécurisée contre la prédictibilité.
 * Format: CMD-2026-X8K9L
 */
export function generateOrderReference(prefix: string = "CMD"): string {
  const year = new Date().getFullYear();
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 32 caractères non ambiguës
  const length = 5;

  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : webcrypto;

  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);

  let randomCode = "";
  for (let i = 0; i < length; i++) {
    randomCode += alphabet[bytes[i] % alphabet.length];
  }

  return `${prefix.toUpperCase()}-${year}-${randomCode}`;
}