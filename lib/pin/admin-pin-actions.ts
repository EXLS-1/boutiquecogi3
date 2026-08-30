// lib/pin/admin-pin-actions.ts

"use server";

/**
 * Server Actions du PIN admin.
 *
 * - verifyAdminPinAction       : vérification utilisateur (session requise +
 *                                anti-brute-force 5 essais / 5 min par utilisateur+IP)
 * - createOrUpdatePinAction    : réservée SUPER_ADMIN (niveau 1) — écrit le PIN dans .env
 * - enablePinAction            : réservée SUPER_ADMIN (niveau 1)
 * - disablePinAction           : réservée SUPER_ADMIN (niveau 1)
 * - getPinInfoAction           : lecture de l'état (SUPER_ADMIN)
 * - invalidatePinSessionAction : révocation de session (session requise)
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  verifyAdminPin,
  markAdminPinVerified,
  isPinEnabled,
  setAdminPin,
  enableAdminPin,
  disableAdminPin,
  getPinInfo,
  clearAdminPinVerification,
  isValidPinFormat,
  type PinPublicInfo,
  type PinWriteResult,
} from "./admin-pin";
import { getServerRBACSession } from "@/lib/auth/server";

/** Type exposé aux composants clients (état public du PIN, sans le code). */
export type PinInfo = PinPublicInfo;

export type PinActionResult = {
  success: boolean;
  error?: string;
  warning?: string;
};

/* ------------------------------------------------------------------ */
/*  Garde SUPER_ADMIN (niveau 1)                                       */
/* ------------------------------------------------------------------ */

/**
 * Vérifie que l'appelant est authentifié et SUPER_ADMIN (niveau 1).
 * Lève une exception sinon. Retourne l'identifiant utilisateur.
 */
async function assertSuperAdmin(): Promise<string> {
  const session = await getServerRBACSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  if (session.level !== 1) {
    throw new Error("FORBIDDEN_NOT_SUPER_ADMIN");
  }
  return session.userId;
}

/* ------------------------------------------------------------------ */
/*  Anti-brute-force                                                   */
/*                                                                     */
/*  Compteur en mémoire par processus (clé : userId|IP) :               */
/*  5 essais erronés max par fenêtre glissante de 1 minutes.            */
/*  Suffisant pour une instance Node unique ; pour un déploiement       */
/*  multi-instances, migrer le compteur vers Redis (lib/redis).         */
/* ------------------------------------------------------------------ */

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 1 * 60 * 1000; // 1 minutes

const attemptStore = new Map<string, { count: number; resetAt: number }>();

function attemptKey(userId: string, ip: string): string {
  return `${userId}|${ip}`;
}

/** Purge les entrées expirées (bornage mémoire, exécuté de façon amortie). */
function pruneAttemptStore(now: number): void {
  if (attemptStore.size < 500) return;
  for (const [key, entry] of attemptStore) {
    if (entry.resetAt <= now) attemptStore.delete(key);
  }
}

/** Retourne le nombre de secondes restantes si la clé est bloquée, sinon 0. */
function getRetryAfterSec(key: string): number {
  const now = Date.now();
  const entry = attemptStore.get(key);
  if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }
  return 0;
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  pruneAttemptStore(now);
  const entry = attemptStore.get(key);
  if (!entry || entry.resetAt <= now) {
    attemptStore.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(key: string): void {
  attemptStore.delete(key);
}

/** IP cliente (premier hop de X-Forwarded-For) pour différencier les sources. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/* ------------------------------------------------------------------ */
/*  Vérification utilisateur                                           */
/* ------------------------------------------------------------------ */

export async function verifyAdminPinAction(
  pin: string,
): Promise<PinActionResult> {
  const session = await getServerRBACSession();
  if (!session) {
    return { success: false, error: "Session invalide" };
  }

  // Anti-brute-force : vérifié AVANT toute autre logique.
  const key = attemptKey(session.userId, await getClientIp());
  const retryAfterSec = getRetryAfterSec(key);
  if (retryAfterSec > 0) {
    return {
      success: false,
      error: `Trop de tentatives. Réessayez dans ${retryAfterSec} s.`,
    };
  }

  const enabled = await isPinEnabled();
  if (!enabled) {
    return { success: false, error: "PIN désactivé" };
  }

  // Validation format côté serveur (longueur + jeu + composition).
  if (!isValidPinFormat(pin)) {
    return {
      success: false,
      error:
        "Le PIN doit contenir 6 caractères : au moins un alphanumérique et un caractère spécial",
    };
  }

  const isValid = await verifyAdminPin(pin);
  if (!isValid) {
    recordFailedAttempt(key);
    return { success: false, error: "Code PIN incorrect" };
  }

  clearAttempts(key);
  await markAdminPinVerified(session.userId);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Gestion SUPER_ADMIN                                                */
/* ------------------------------------------------------------------ */

export async function createOrUpdatePinAction(
  pin: string,
): Promise<PinActionResult> {
  let userId: string;
  try {
    userId = await assertSuperAdmin();
  } catch {
    return { success: false, error: "Accès réservé au SUPER_ADMIN" };
  }

  if (!isValidPinFormat(pin)) {
    return {
      success: false,
      error:
        "Le PIN doit contenir le nombre exact des caractères : au moins un alphanumérique et un caractère spécial",
    };
  }

  try {
    const result: PinWriteResult = await setAdminPin(pin, userId);
    if (!result.success) {
      return { success: false, error: "Format PIN invalide" };
    }

    // Le nouveau PIN révoque les sessions PIN en cours (re-vérification exigée).
    await clearAdminPinVerification();
    revalidatePath("/super_admin");
    return { success: true, warning: result.warning };
  } catch (error) {
    console.error(
      "[ADMIN_PIN_UPSERT_ERROR] Erreur d'enregistrement :",
      error,
    );
    return { success: false, error: "Erreur lors de l'enregistrement du PIN" };
  }
}

/* ------------------------------------------------------------------ */
/*  Informations (lecture seule)                                       */
/* ------------------------------------------------------------------ */

/**
 * Retourne l'état courant du PIN pour le SUPER_ADMIN.
 * Retourne `null` si l'appelant n'est pas SUPER_ADMIN
 * (le composant affiche alors « Accès refusé »).
 */
export async function getPinInfoAction(): Promise<PinInfo | null> {
  try {
    await assertSuperAdmin();
  } catch {
    return null;
  }

  try {
    return await getPinInfo();
  } catch (error) {
    console.error("[ADMIN_PIN_INFO_ERROR] Erreur de lecture :", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Activation / désactivation                                         */
/* ------------------------------------------------------------------ */

export async function enablePinAction(): Promise<PinActionResult> {
  try {
    await assertSuperAdmin();
  } catch {
    return { success: false, error: "Accès réservé au SUPER_ADMIN" };
  }

  try {
    const info = await getPinInfo();
    if (!info.configured) {
      return {
        success: false,
        error: "Aucun PIN configuré. Créez d'abord un code PIN.",
      };
    }

    const result = await enableAdminPin();
    if (!result.success) {
      return { success: false, error: "Impossible d'activer le PIN" };
    }

    revalidatePath("/super_admin");
    return { success: true, warning: result.warning };
  } catch (error) {
    console.error("[ADMIN_PIN_ENABLE_ERROR] Erreur d'activation :", error);
    return { success: false, error: "Erreur lors de l'activation du PIN" };
  }
}

export async function disablePinAction(): Promise<PinActionResult> {
  try {
    await assertSuperAdmin();
  } catch {
    return { success: false, error: "Accès réservé au SUPER_ADMIN" };
  }

  try {
    const result = await disableAdminPin();
    if (!result.success) {
      return { success: false, error: "Impossible de désactiver le PIN" };
    }

    // Révoque les sessions PIN en cours : plus aucune page admin protégée par
    // le PIN tant que la protection n'est pas réactivée.
    await clearAdminPinVerification();
    revalidatePath("/super_admin");
    return { success: true, warning: result.warning };
  } catch (error) {
    console.error("[ADMIN_PIN_DISABLE_ERROR] Erreur de désactivation :", error);
    return {
      success: false,
      error: "Erreur lors de la désactivation du PIN",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Session PIN                                                        */
/* ------------------------------------------------------------------ */

/**
 * Invalide la session PIN courante (appelé après 5 min d'inactivité).
 * Exige une session valide : évite qu'un appelant non authentifié provoque
 * des révocations en masse (nuisance).
 */
export async function invalidatePinSessionAction(): Promise<{
  success: boolean;
}> {
  const session = await getServerRBACSession();
  if (!session) {
    return { success: false };
  }

  await clearAdminPinVerification();
  return { success: true };
}