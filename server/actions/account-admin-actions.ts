// server/actions/account-admin-actions.ts
// ============================================
// Server Actions pour la gestion admin des comptes (Account model)
// ============================================

"use server";

import {
  AccountAdminService,
  AccountAdminServiceError,
} from "@/server/services/account-admin-service";
import {
  deleteAccountSchema,
  getAccountSchema,
  type ListAccountsInput,
} from "@/lib/validations/account";
import { revalidatePath } from "next/cache";
import { AuthorizationError } from "@/server/core/secure-prisma";

// ─── Helper types ───────────────────────────

type ActionResult<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      error: string;
      code: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

function getErrorCode(error: unknown): string {
  if (error instanceof AccountAdminServiceError) return error.code;
  if (error instanceof AuthorizationError) return error.code;
  if (error instanceof Error && "code" in error)
    return (error as unknown).code || "UNKNOWN_ERROR";
  return "INTERNAL_ERROR";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur serveur inattendue";
}

// ─── Actions ────────────────────────────────

/**
 * Lister les comptes avec pagination et filtres
 */
export async function listAccountsAction(
  page: number = 1,
  pageSize: number = 25,
  search?: string,
  provider?: string,
  type?: string,
  sortBy?: string,
  sortOrder?: string
): Promise<ActionResult> {
  try {
    const result = await AccountAdminService.list({
      page,
      pageSize,
      search,
      provider,
      type,
      sortBy: sortBy as ListAccountsInput["sortBy"],
      sortOrder: sortOrder as ListAccountsInput["sortOrder"],
    });
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}

/**
 * Récupérer les détails d'un compte
 */
export async function getAccountAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = getAccountSchema.safeParse({ accountId: raw.accountId });

    if (!parsed.success) {
      return {
        success: false,
        error: "ID de compte invalide",
        code: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const account = await AccountAdminService.getById(parsed.data);
    return { success: true, data: account };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}

/**
 * Supprimer un compte d'authentification
 */
export async function deleteAccountAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = deleteAccountSchema.safeParse({
      accountId: raw.accountId,
      reason: raw.reason || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Données invalides",
        code: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const result = await AccountAdminService.delete(parsed.data);
    revalidatePath("/admin/account");
    revalidatePath(`/admin/users`);

    return {
      success: true,
      data: result,
      message: `Compte supprimé pour ${result.userEmail}`,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}

/**
 * Récupérer les providers distincts pour les filtres
 */
export async function getDistinctProvidersAction(): Promise<ActionResult> {
  try {
    const providers = await AccountAdminService.getDistinctProviders();
    return { success: true, data: providers };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}
