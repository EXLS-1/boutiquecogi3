// app/actions/admin/products/_shared/action-result.ts
// SHARED - ActionResult type for product actions

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };

export function actionSuccess<T>(message: string, data: T): ActionResult<T> {
  return { success: true, data };
}

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
// app/actions/admin/products/_shared/action-result.ts
// SHARED - ActionResult type for product actions

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };

export function actionSuccess<T>(message: string, data: T): ActionResult<T> {
  return { success: true, data };
}

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
// app/actions/admin/products/_shared/action-result.ts
// ═════════════════════════════════════════════════════════════════════════════
// SHARED — ActionResult type for product actions
// ═════════════════════════════════════════════════════════════════════════════

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: Record<string, unknown> } };

export function actionSuccess<T>(message: string, data: T): ActionResult<T> {
  return { success: true, data };
}

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