// app/actions/admin/products/_shared/action-result.ts
// ═════════════════════════════════════════════════════════════════════════════
// SHARED — ActionResult type for product actions
// Contrat commun aux Server Actions produit, sérialisable vers un Client Component.

export interface ActionErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ActionResult<T = unknown> =
  | { success: true; code: string; message: string; data: T }
  | { success: false; error: ActionErrorPayload };

/**
 * Succès d'action : `(code, message, data?)`.
 * `code` est le code machine stable (ex. "PRODUCT_CREATED") consommé par l'UI,
 * `message` alimente le toast, `data` porte la charge utile optionnelle
 * (certaines actions n'en ont aucune, ex. `actionSuccess("PRODUCT_APPROVED",
 * "Produit approuvé")`).
 */
export function actionSuccess(code: string, message: string): ActionResult<undefined>;
export function actionSuccess<T>(code: string, message: string, data: T): ActionResult<T>;
export function actionSuccess<T>(
  code: string,
  message: string,
  data?: T
): ActionResult<T | undefined> {
  return { success: true, code, message, data };
}

/**
 * Échec d'action : `(code, message, details?)`.
 * `details` transporte les erreurs de champ (validation Zod) au formulaire.
 */
export function actionError(
  code: string,
  message: string,
  details?: unknown
): ActionResult<never> {
  const serializableDetails =
    typeof details === "object" && details !== null && !Array.isArray(details)
      ? Object.fromEntries(Object.entries(details))
      : undefined;

  return {
    success: false,
    error: {
      code,
      message,
      ...(serializableDetails ? { details: serializableDetails } : {}),
    },
  };
}