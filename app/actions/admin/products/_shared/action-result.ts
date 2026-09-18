// app/actions/admin/products/_shared/action-result.ts
// ═════════════════════════════════════════════════════════════════════════════
// SHARED — ActionResult type for product actions
// Contrat unique des Server Actions produit : toutes les actions du dossier
// `app/actions/admin/products/**` renvoient cette forme, directement
// sérialisable vers un Client Component (aucun Decimal/Date/JsonValue brut).

export interface ActionErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: ActionErrorPayload };

/**
 * Succès d'action : `(code, message, data?)`.
 * `code` est le code machine stable (ex. "PRODUCT_CREATED") consommé par l'UI,
 * `message` alimente le toast, `data` porte la charge utile optionnelle
 * (certaines actions n'en ont aucune, ex. `actionSuccess("PRODUCT_APPROVED",
 * "Produit approuvé")`).
 */
export function actionSuccess<T = undefined>(
  code: string,
  message: string,
  data?: T
): ActionResult<T> {
  void code;
  void message;
  return { success: true, data: data as T };
}

/**
 * Échec d'action : `(code, message, details?)`.
 * `details` transporte les erreurs de champ (validation Zod) au formulaire.
 */
export function actionError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ActionResult<never> {
  return {
    success: false,
    error: { code, message, details },
  };
}