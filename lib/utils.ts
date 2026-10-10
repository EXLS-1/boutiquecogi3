// lib/utils.ts
// =============================================================================
// UTILITAIRES PARTAGÉS — classNames + validateurs d'identifiants
// =============================================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combine des classes conditionnelles et résout les conflits Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// UUID v1–v8 (couvre uuid v4/v7 utilisés par Prisma `uuid()` / `uuidv7()`).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Garde de type : `true` si la valeur est une chaîne UUID canonique.
 * Utilisé pour rejeter tôt les segments dynamiques non-UUID avant toute
 * requête Prisma sur une colonne `uuid` (évite « invalid input syntax
 * for type uuid » côté PostgreSQL).
 */
export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}
