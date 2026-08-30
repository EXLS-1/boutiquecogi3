// lib/pin/admin-pin.ts

/**
 * Sécurité PIN admin — SOURCE DE VÉRITÉ : LE FICHIER .ENV
 * =======================================================
 * Variables utilisées :
 *   - ADMIN_PIN          : code PIN à 6 caractères (alphanumérique + spécial)
 *   - ADMIN_PIN_ENABLED  : "true"/"false" — protection activée ou non
 *
 * Le code PIN n'est JAMAIS stocké en base de données : seule une ligne de
 * métadonnées (date/auteur de la dernière modification) est conservée dans
 * SystemConfiguration. La ligne historique contenant le PIN en clair
 * (`admin.pin.config`) est purgée au premier enregistrement.
 *
 * Session PIN : cookie httpOnly signé (JWT HS256 via `jose` — même convention
 * que lib/2fa-cookie.ts), lié à l'utilisateur, expirant après 5 minutes
 * (expiration vérifiée cryptographiquement côté serveur, pas seulement par le
 * navigateur). Le token embarque `iat` : la page /admin exige une vérification
 * « fraîche » (≤ ADMIN_PIN_ENTRY_GRACE_SEC) pour ré-afficher le gate à chaque
 * refresh et à chaque retour sur la page admin.
 */

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { upsertEnvFiles } from "./env-file";

/* ------------------------------------------------------------------ */
/*  Constantes                                                         */
/* ------------------------------------------------------------------ */

const PIN_LENGTH = 6;
const PIN_COOKIE_NAME = "admin-pin-verified";
const PIN_COOKIE_MAX_AGE = 300; // 5 minutes

/**
 * Fenêtre (en secondes) pendant laquelle une vérification PIN reste
 * « fraîche » pour (re)entrer sur /admin. Assez longue pour couvrir le
 * round-trip server action → router.refresh() qui suit la saisie du PIN ;
 * tout refresh/retour ultérieur exige une nouvelle saisie.
 */
export const ADMIN_PIN_ENTRY_GRACE_SEC = 10;

/**
 * Jeu de caractères autorisé : alphanumériques + caractères spéciaux.
 * `"` et `\` sont exclus (incompatibles avec une écriture fiable dans .env).
 * Le PIN doit également contenir AU MOINS un alphanumérique ET un spécial
 * (exigence : « alphanumérique + caractère spécial »).
 * Exemples valides : "Abc@12", "P@ssw0", "X#9!zQ", "SA@576"
 */
const PIN_CHARSET_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};:'?,.<>\/|`~]{6}$/;
const PIN_HAS_ALNUM_REGEX = /[A-Za-z0-9]/;
const PIN_HAS_SPECIAL_REGEX = /[^A-Za-z0-9]/;

/** Ancienne clé (PIN en clair en base) — purgée à la première écriture. */
const LEGACY_PIN_CONFIG_KEY = "admin.pin.config";
/** Clé des métadonnées du PIN (sans le code) dans SystemConfiguration. */
const PIN_META_KEY = "admin.pin.meta";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Informations publiques sur le PIN (sans jamais révéler le code). */
export type PinPublicInfo = {
  enabled: boolean;
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

/** Résultat des opérations d'écriture (création/activation/désactivation). */
export type PinWriteResult = {
  success: boolean;
  /** Présent quand l'opération est effective mais la persistance .env a échoué. */
  warning?: string;
};

/* ------------------------------------------------------------------ */
/*  Configuration .env (source de vérité)                              */
/* ------------------------------------------------------------------ */

/**
 * Retourne le PIN courant depuis `.env` (`process.env`), ou `null` s'il est
 * absent ou non conforme au format requis.
 */
export function getEnvAdminPin(): string | null {
  const raw = process.env.ADMIN_PIN;
  return raw && isValidPinFormat(raw) ? raw : null;
}

/** État du flag `ADMIN_PIN_ENABLED` (défaut : true). */
function isEnvFlagEnabled(): boolean {
  const raw = (process.env.ADMIN_PIN_ENABLED ?? "true").trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Vérifie si un PIN respecte le format requis :
 * 6 caractères du jeu autorisé, avec au moins un alphanumérique
 * et au moins un caractère spécial.
 */
export function isValidPinFormat(pin: string): boolean {
  return (
    typeof pin === "string" &&
    pin.length === PIN_LENGTH &&
    PIN_CHARSET_REGEX.test(pin) &&
    PIN_HAS_ALNUM_REGEX.test(pin) &&
    PIN_HAS_SPECIAL_REGEX.test(pin)
  );
}

/* ------------------------------------------------------------------ */
/*  Métadonnées (SystemConfiguration — sans jamais y stocker le code)  */
/* ------------------------------------------------------------------ */

async function readPinMeta(): Promise<{
  updatedAt: string | null;
  updatedBy: string | null;
}> {
  try {
    const row = await prisma.systemConfiguration.findUnique({
      where: { key: PIN_META_KEY },
    });
    if (!row?.value) return { updatedAt: null, updatedBy: null };

    const parsed = JSON.parse(row.value) as {
      updatedAt?: string;
      updatedBy?: string;
    };
    return {
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      updatedBy: typeof parsed.updatedBy === "string" ? parsed.updatedBy : null,
    };
  } catch (error) {
    console.error(
      "[ADMIN_PIN_META_READ_ERROR] Lecture des métadonnées PIN :",
      error,
    );
    return { updatedAt: null, updatedBy: null };
  }
}

async function writePinMeta(updatedBy: string): Promise<void> {
  const now = new Date().toISOString();
  const value = JSON.stringify({ updatedAt: now, updatedBy });
  try {
    await prisma.systemConfiguration.upsert({
      where: { key: PIN_META_KEY },
      update: { value, updatedAt: new Date() },
      create: {
        id: generateUUIDv7(),
        key: PIN_META_KEY,
        value,
      },
    });
  } catch (error) {
    console.error(
      "[ADMIN_PIN_META_WRITE_ERROR] Écriture des métadonnées PIN :",
      error,
    );
  }
}

/** Purge l'ancienne ligne SystemConfiguration contenant le PIN en clair. */
async function purgeLegacyPinRow(): Promise<void> {
  try {
    await prisma.systemConfiguration.deleteMany({
      where: { key: LEGACY_PIN_CONFIG_KEY },
    });
  } catch {
    // Best-effort : la purge n'est pas critique au fonctionnement.
  }
}

/* ------------------------------------------------------------------ */
/*  État du PIN                                                        */
/* ------------------------------------------------------------------ */

/**
 * Indique si la protection PIN est activée (flag .env ET PIN valide configuré).
 */
export async function isPinEnabled(): Promise<boolean> {
  return isEnvFlagEnabled() && getEnvAdminPin() !== null;
}

/**
 * Retourne les informations publiques sur le PIN (sans jamais révéler le code).
 */
export async function getPinInfo(): Promise<PinPublicInfo> {
  const configured = getEnvAdminPin() !== null;
  const meta = await readPinMeta();

  return {
    enabled: isEnvFlagEnabled() && configured,
    configured,
    updatedAt: meta.updatedAt,
    updatedBy: meta.updatedBy,
  };
}

/* ------------------------------------------------------------------ */
/*  Vérification (comparaison timing-safe)                             */
/* ------------------------------------------------------------------ */

/**
 * Comparaison à temps constant : les deux valeurs sont hachées (SHA-256) pour
 * égaliser les longueurs, puis comparées via `timingSafeEqual` — aucune fuite
 * d'information par mesure du temps de comparaison.
 */
function timingSafePinCompare(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Vérifie un PIN soumis contre la valeur du fichier .env.
 * Échoue (fail-closed) si la protection est désactivée ou sans PIN valide.
 */
export async function verifyAdminPin(pin: string): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false;

  const expected = getEnvAdminPin();
  if (!expected || !isEnvFlagEnabled()) return false;

  return timingSafePinCompare(pin, expected);
}

/* ------------------------------------------------------------------ */
/*  Gestion SUPER_ADMIN (écriture .env + process.env)                  */
/* ------------------------------------------------------------------ */

/**
 * Crée/modifie le PIN : effet immédiat (`process.env`) + persistance `.env`.
 * La création/modification active la protection (comportement historique).
 */
export async function setAdminPin(
  pin: string,
  updatedBy: string,
): Promise<PinWriteResult> {
  if (!isValidPinFormat(pin)) return { success: false };

  // Effet immédiat pour le process courant (pas besoin de redémarrage).
  process.env.ADMIN_PIN = pin;
  process.env.ADMIN_PIN_ENABLED = "true";

  const written = await upsertEnvFiles("ADMIN_PIN", pin);
  await upsertEnvFiles("ADMIN_PIN_ENABLED", "true");

  await purgeLegacyPinRow();
  await writePinMeta(updatedBy);

  if (written.length === 0) {
    console.warn(
      "[ADMIN_PIN_ENV] PIN actif en mémoire mais non persisté sur disque (FS lecture seule ?).",
    );
    return {
      success: true,
      warning:
        "PIN actif immédiatement, mais non persisté dans .env (système de fichiers en lecture seule)",
    };
  }
  return { success: true };
}

/** Active la protection PIN. Échoue si aucun PIN valide n'est configuré. */
export async function enableAdminPin(): Promise<PinWriteResult> {
  if (getEnvAdminPin() === null) return { success: false };

  process.env.ADMIN_PIN_ENABLED = "true";
  const written = await upsertEnvFiles("ADMIN_PIN_ENABLED", "true");

  return {
    success: true,
    warning:
      written.length === 0
        ? "Protection activée, mais non persistée dans .env (système de fichiers en lecture seule)"
        : undefined,
  };
}

/** Désactive la protection PIN (la révocation des sessions est faite par l'appelant). */
export async function disableAdminPin(): Promise<PinWriteResult> {
  process.env.ADMIN_PIN_ENABLED = "false";
  const written = await upsertEnvFiles("ADMIN_PIN_ENABLED", "false");

  return {
    success: true,
    warning:
      written.length === 0
        ? "Protection désactivée, mais non persistée dans .env (système de fichiers en lecture seule)"
        : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Session PIN (cookie httpOnly signé, 5 min)                         */
/* ------------------------------------------------------------------ */

/**
 * Secret de signature du cookie (HS256). Dédié `ADMIN_PIN_COOKIE_SECRET`,
 * sinon retombe sur `BETTER_AUTH_SECRET`. Évalué à l'appel (jamais à
 * l'import) pour ne pas casser le build si la variable manque au bundling.
 */
function getPinSecret(): Uint8Array {
  const raw =
    process.env.ADMIN_PIN_COOKIE_SECRET || process.env.BETTER_AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "[ADMIN_PIN] Secret de signature manquant : définissez ADMIN_PIN_COOKIE_SECRET (>= 32 caractères) dans .env",
    );
  }
  return new TextEncoder().encode(raw);
}

/**
 * Indique si la session PIN courante est validée pour `userId`
 * (lecture seule, utilisable pendant le rendu d'un Server Component).
 * Le token étant signé et lié à l'utilisateur, il est inforgeable
 * et non transférable entre comptes.
 */
export async function isAdminPinVerified(userId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PIN_COOKIE_NAME)?.value;
    if (!raw) return false;

    const { payload } = await jwtVerify(raw, getPinSecret(), {
      clockTolerance: 5,
    });
    return (
      (payload.type as string | undefined) === "admin-pin-verified" &&
      payload.sub === userId
    );
  } catch {
    // Cookie absent, altéré, expiré ou signature invalide → fail-closed.
    return false;
  }
}

/**
 * Vrai si le PIN a été vérifié il y a moins de `ADMIN_PIN_ENTRY_GRACE_SEC`.
 * Utilisé par la page /admin pour ré-afficher le gate à chaque refresh et à
 * chaque retour sur la page admin (exigence fonctionnelle).
 */
export async function hasFreshAdminPinEntry(
  userId: string,
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PIN_COOKIE_NAME)?.value;
    if (!raw) return false;

    const { payload } = await jwtVerify(raw, getPinSecret(), {
      clockTolerance: 5,
    });
    if (
      (payload.type as string | undefined) !== "admin-pin-verified" ||
      payload.sub !== userId
    ) {
      return false;
    }

    const iat = typeof payload.iat === "number" ? payload.iat : 0;
    return Date.now() / 1000 - iat <= ADMIN_PIN_ENTRY_GRACE_SEC;
  } catch {
    return false;
  }
}

/**
 * Marque la session PIN comme validée (uniquement dans une server action) :
 * cookie httpOnly contenant un JWT lié à l'utilisateur, expirant après 5 min.
 */
export async function markAdminPinVerified(userId: string): Promise<void> {
  const token = await new SignJWT({ type: "admin-pin-verified" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${PIN_COOKIE_MAX_AGE}s`)
    .sign(getPinSecret());

  const cookieStore = await cookies();
  cookieStore.set({
    name: PIN_COOKIE_NAME,
    value: token,
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