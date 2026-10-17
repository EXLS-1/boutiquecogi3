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
} from "@/lib/validations/account.schema";
import { revalidatePath } from "next/cache";
import { AuthorizationError } from "@/server/core/secure-prisma";
import type { ActionResult } from "@/server/core/action-result";
import {
  recordServerActionAudit,
  AuditSeverity,
} from "@/server/services/audit.service";

// ─── Error helpers ────────────────────────────────────────────────────────────

function getErrorCode(error: unknown): string {
  if (error instanceof AccountAdminServiceError) return error.code;
  if (error instanceof AuthorizationError) return error.code;
  if (error instanceof Error && "code" in error)
    return (error as unknown as { code: string }).code || "UNKNOWN_ERROR";
  return "INTERNAL_ERROR";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur serveur inattendue";
}

// ─── Actions ──────────────────────────────────────────────────────────────────

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
 * Supprimer un compte d'authentification.
 * Opération CRITIQUE — toujours auditée, y compris en cas d'échec.
 */
export async function deleteAccountAction(
  formData: FormData
): Promise<ActionResult> {
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

  try {
    const result = await AccountAdminService.delete(parsed.data);

    // Audit de la suppression réussie (le service interne peut également auditer —
    // cet appel sert de filet de sécurité au niveau action)
    await recordServerActionAudit({
      action: "ACCOUNT_DELETE",
      targetId: parsed.data.accountId,
      targetType: "ACCOUNT",
      severity: AuditSeverity.CRITICAL,
      details: { userEmail: result.userEmail, reason: parsed.data.reason },
    });

    revalidatePath("/admin/account");
    revalidatePath(`/admin/users`);

    return {
      success: true,
      data: result,
      message: `Compte supprimé pour ${result.userEmail}`,
    };
  } catch (error) {
    // Toute tentative échouée doit aussi être tracée
    await recordServerActionAudit({
      action: "ACCOUNT_DELETE",
      targetId: parsed.data.accountId,
      targetType: "ACCOUNT",
      severity: AuditSeverity.CRITICAL,
      status: "FAILED",
      error: getErrorMessage(error),
    });

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
