// lib/pin/admin-pin-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import {
  verifyAdminPin,
  markAdminPinVerified,
  isPinEnabled,
  setAdminPin,
  enableAdminPin,
  disableAdminPin,
  getPinInfo,
  clearAdminPinVerification,
  isValidPinFormat, // ← NOUVEAU
  type PinPublicInfo,
} from "./admin-pin";
import { getServerRBACSession } from "@/lib/auth/server";

/** Type exposé aux composants clients (état public du PIN, sans le code). */
export type PinInfo = PinPublicInfo;

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
/*  Vérification utilisateur                                           */
/* ------------------------------------------------------------------ */

export async function verifyAdminPinAction(
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerRBACSession();
  if (!session) {
    return { success: false, error: "Session invalide" };
  }

  const enabled = await isPinEnabled();
  if (!enabled) {
    return { success: false, error: "PIN désactivé" };
  }

  // Validation format côté serveur
  if (!isValidPinFormat(pin)) {
    return {
      success: false,
      error: "Le PIN doit contenir exactement 6 caractères (lettres, chiffres ou spéciaux)",
    };
  }

  const isValid = await verifyAdminPin(pin);
  if (!isValid) {
    return { success: false, error: "Code PIN incorrect" };
  }

  await markAdminPinVerified();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Gestion SUPER_ADMIN                                                */
/* ------------------------------------------------------------------ */

export async function createOrUpdatePinAction(
  pin: string,
): Promise<{ success: boolean; error?: string }> {
  let userId: string;
  try {
    userId = await assertSuperAdmin();
  } catch {
    return { success: false, error: "Accès réservé au SUPER_ADMIN" };
  }

  if (!isValidPinFormat(pin)) {
    return {
      success: false,
      error: "Le PIN doit contenir exactement 6 caractères (lettres, chiffres ou spéciaux)",
    };
  }

  try {
    const success = await setAdminPin(pin, userId);
    if (!success) {
      return { success: false, error: "Format PIN invalide" };
    }

    await clearAdminPinVerification();
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN_PIN_UPSERT_ERROR] Erreur d'enregistrement :", error);
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

export async function enablePinAction(): Promise<{
  success: boolean;
  error?: string;
}> {
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

    const success = await enableAdminPin();
    if (!success) {
      return { success: false, error: "Impossible d'activer le PIN" };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN_PIN_ENABLE_ERROR] Erreur d'activation :", error);
    return { success: false, error: "Erreur lors de l'activation du PIN" };
  }
}

export async function disablePinAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await assertSuperAdmin();
  } catch {
    return { success: false, error: "Accès réservé au SUPER_ADMIN" };
  }

  try {
    const success = await disableAdminPin();
    if (!success) {
      return { success: false, error: "Impossible de désactiver le PIN" };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("[ADMIN_PIN_DISABLE_ERROR] Erreur de désactivation :", error);
    return { success: false, error: "Erreur lors de la désactivation du PIN" };
  }
}

/* ------------------------------------------------------------------ */
/*  Session PIN                                                        */
/* ------------------------------------------------------------------ */

/**
 * Invalide la session PIN courante (appelé après inactivité).
 */
export async function invalidatePinSessionAction(): Promise<{
  success: boolean;
}> {
  await clearAdminPinVerification();
  return { success: true };
}
