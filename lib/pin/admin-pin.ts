// lib/pin/admin-pin.ts

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const PIN_LENGTH = 6;
const PIN_COOKIE_NAME = "admin-pin-verified";
const PIN_COOKIE_MAX_AGE = 300; // 5 minutes

/**
 * Clé de persistance du PIN dans la table SystemConfiguration (clé/valeur).
 * La valeur stockée est un JSON sérialisé de `PinConfig`.
 */
const PIN_CONFIG_KEY = "admin.pin.config";

/**
 * Regex acceptant : lettres, chiffres et caractères spéciaux courants.
 * Exemples valides : "Abc123", "P@ssw0", "X#9!zQ"
 */
const PIN_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]{6}$/;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Configuration complète du PIN (jamais exposée au client). */
export type PinConfig = {
  pin: string;
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

/** Informations publiques sur le PIN (sans jamais révéler le code). */
export type PinPublicInfo = {
  enabled: boolean;
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

/* ------------------------------------------------------------------ */
/*  Persistance (SystemConfiguration — clé/valeur)                     */
/* ------------------------------------------------------------------ */

/**
 * Lit la configuration du PIN. Retourne `null` si absente ou corrompue.
 */
async function readPinConfig(): Promise<PinConfig | null> {
  try {
    const row = await prisma.systemConfiguration.findUnique({
      where: { key: PIN_CONFIG_KEY },
    });
    if (!row?.value) return null;

    const parsed = JSON.parse(row.value) as PinConfig;
    if (typeof parsed?.pin !== "string") return null;
    return parsed;
  } catch (error) {
    console.error(
      "[ADMIN_PIN_READ_ERROR] Lecture de la configuration PIN :",
      error,
    );
    return null;
  }
}

/**
 * Écrit (upsert) la configuration du PIN.
 */
async function writePinConfig(config: PinConfig): Promise<void> {
  try {
    await prisma.systemConfiguration.upsert({
      where: { key: PIN_CONFIG_KEY },
      update: {
        value: JSON.stringify(config),
        updatedAt: new Date(),
      },
      create: {
        id: generateUUIDv7(),
        key: PIN_CONFIG_KEY,
        value: JSON.stringify(config),
      },
    });
  } catch (error) {
    console.error(
      "[ADMIN_PIN_WRITE_ERROR] Écriture de la configuration PIN :",
      error,
    );
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Vérifie si un PIN respecte le format requis.
 */
export function isValidPinFormat(pin: string): boolean {
  return pin.length === PIN_LENGTH && PIN_REGEX.test(pin);
}

/* ------------------------------------------------------------------ */
/*  État du PIN                                                        */
/* ------------------------------------------------------------------ */

/**
 * Indique si la protection PIN est activée.
 */
export async function isPinEnabled(): Promise<boolean> {
  const config = await readPinConfig();
  return config?.enabled ?? false;
}

/**
 * Active la protection PIN. Échoue si aucun PIN n'est configuré.
 */
export async function enableAdminPin(): Promise<boolean> {
  const config = await readPinConfig();
  if (!config) return false; // aucun PIN configuré
  if (config.enabled) return true;

  await writePinConfig({
    ...config,
    enabled: true,
    updatedAt: new Date().toISOString(),
  });
  return true;
}

/**
 * Désactive la protection PIN et révoque les sessions PIN en cours.
 */
export async function disableAdminPin(): Promise<boolean> {
  const config = await readPinConfig();
  if (!config) return false;
  if (!config.enabled) return true;

  await writePinConfig({
    ...config,
    enabled: false,
    updatedAt: new Date().toISOString(),
  });
  await clearAdminPinVerification();
  return true;
}

/**
 * Retourne les informations publiques sur le PIN (sans jamais révéler le code).
 */
export async function getPinInfo(): Promise<PinPublicInfo> {
  const config = await readPinConfig();
  if (!config) {
    return {
      enabled: false,
      configured: false,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    enabled: config.enabled,
    configured: isValidPinFormat(config.pin),
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
  };
}

/* ------------------------------------------------------------------ */
/*  Vérification                                                       */
/* ------------------------------------------------------------------ */

export async function verifyAdminPin(pin: string): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false;

  const config = await readPinConfig();
  if (!config || !config.enabled) return false;

  return pin === config.pin;
}

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export async function setAdminPin(
  pin: string,
  updatedBy: string,
): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false;

  const config: PinConfig = {
    pin,
    enabled: true,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await writePinConfig(config);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Session PIN (cookie httpOnly, 5 min)                               */
/* ------------------------------------------------------------------ */

/**
 * Indique si la session PIN courante est validée (lecture seule,
 * utilisable pendant le rendu d'un Server Component).
 */
export async function isAdminPinVerified(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PIN_COOKIE_NAME)?.value === "1";
}

/**
 * Marque la session PIN comme validée (uniquement dans une server action).
 */
export async function markAdminPinVerified(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: PIN_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });
}

/**
 * Invalide la session PIN courante (uniquement dans une server action).
 */
export async function clearAdminPinVerification(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PIN_COOKIE_NAME);
}
