// server/core/action-result.ts
// ============================================
// TYPE STANDARDISÉ ActionResult<T>
// ============================================
// Contrat uniforme pour l'ensemble des Server Actions de l'application :
//   - Succès : { success: true, data: T, message?: string }
//   - Échec  : { success: false, error: string, code: string, fieldErrors?: Record<string, string[] | undefined> }

export type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

/**
 * Crée un résultat d'action avec succès standardisé
 */
export function actionSuccess<T>(data: T, message?: string): ActionResult<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
}

/**
 * Crée un résultat d'action avec échec standardisé
 */
export function actionError(
  error: string,
  code: string = "INTERNAL_ERROR",
  fieldErrors?: Record<string, string[] | undefined>
): ActionResult<never> {
  return {
    success: false,
    error,
    code,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}
