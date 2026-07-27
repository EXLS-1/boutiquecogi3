// server/actions/deleted-account-admin-actions.ts
// ============================================
// Server Actions pour la gestion admin du registre des comptes supprimés
// ============================================
// Permet aux administrateurs de :
//   - Consulter le registre des comptes supprimés
//   - Voir le snapshot complet des données
//   - Restaurer un compte supprimé
// ============================================

"use server";

import {
  DeletedAccountAdminService,
  DeletedAccountAdminServiceError,
} from "@/server/services/deleted-account-admin-service";
import {
  restoreDeletedAccountSchema,
  listDeletedAccountsSchema,
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
  if (error instanceof DeletedAccountAdminServiceError) return error.code;
  if (error instanceof AuthorizationError) return error.code;
  if (error instanceof Error && "code" in error)
    return (error as unknown as { code: string }).code || "UNKNOWN_ERROR";
  return "INTERNAL_ERROR";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur serveur inattendue";
}

// ─── Actions ────────────────────────────────

/**
 * Lister les comptes supprimés avec pagination, recherche et tri
 */
export async function listDeletedAccountsAction(
  page: number = 1,
  pageSize: number = 25,
  search?: string,
  sortBy?: string,
  sortOrder?: string
): Promise<ActionResult> {
  try {
    const result = await DeletedAccountAdminService.list({
      page,
      pageSize,
      search,
      sortBy: sortBy as "createdAt" | "userEmail" | "deletedBy" | undefined,
      sortOrder: sortOrder as "asc" | "desc" | undefined,
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
 * Récupérer les détails complets d'une entrée du registre (avec snapshot)
 */
export async function getDeletedAccountDetailAction(
  registryId: string
): Promise<ActionResult> {
  try {
    const result = await DeletedAccountAdminService.getById(registryId);
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
 * Restaurer un compte supprimé à partir du registre
 */
export async function restoreDeletedAccountAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = restoreDeletedAccountSchema.safeParse({
      registryId: raw.registryId,
      note: raw.note || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Données invalides",
        code: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const result = await DeletedAccountAdminService.restore(parsed.data);
    revalidatePath("/admin/accounts/deleted");

    return {
      success: true,
      data: result,
      message: `Compte restauré avec succès`,
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
 * Obtenir les statistiques du registre
 */
export async function getDeletedAccountStatsAction(): Promise<ActionResult> {
  try {
    const result = await DeletedAccountAdminService.getStats();
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}
