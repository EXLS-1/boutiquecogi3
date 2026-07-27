// server/actions/account-self-actions.ts
// ============================================
// Server Actions pour l'auto-suppression de compte utilisateur
// ============================================

"use server";

import {
  AccountSelfService,
  AccountSelfServiceError,
} from "@/server/services/account-self-service";
import { selfDeleteAccountSchema } from "@/lib/validations/account";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  if (error instanceof AccountSelfServiceError) return error.code;
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
 * Supprimer son propre compte utilisateur.
 * Cette action est irréversible!
 */
export async function deleteMyAccountAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const raw = Object.fromEntries(formData);
    const parsed = selfDeleteAccountSchema.safeParse({
      reason: raw.reason,
      password: raw.password,
      confirmation: raw.confirmation === "true" || raw.confirmation === true,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Données invalides",
        code: "VALIDATION_ERROR",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const result = await AccountSelfService.deleteMyAccount(parsed.data);

    // Rediriger vers une page de confirmation après suppression
    // On ne peut pas redirect() ici car on est dans un try/catch avec return
    // Le client fera la redirection

    return {
      success: true,
      data: result,
      message: result.message,
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
 * Vérifier si l'utilisateur peut supprimer son compte.
 * Retourne les raisons pour lesquelles la suppression n'est pas possible.
 */
export async function canDeleteAccountAction(): Promise<ActionResult> {
  try {
    // On obtient l'ID utilisateur depuis le contexte sécurisé
    const { AccountSelfService } = await import(
      "@/server/services/account-self-service"
    );
    const { withSecurePrisma } = await import("@/server/core/secure-prisma");

    const result = await withSecurePrisma(
      async (ctx) => {
        return AccountSelfService.canDeleteAccount(ctx.userId);
      },
      {
        minRoleLevel: 7,
        auditLog: false,
      }
    );

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
 * Récupérer l'historique des suppressions de l'utilisateur connecté.
 */
export async function getMyDeletionHistoryAction(): Promise<ActionResult> {
  try {
    const { AccountSelfService } = await import(
      "@/server/services/account-self-service"
    );
    const { withSecurePrisma } = await import("@/server/core/secure-prisma");

    const result = await withSecurePrisma(
      async (ctx) => {
        return AccountSelfService.getDeletionHistory(ctx.userId);
      },
      {
        minRoleLevel: 7,
        auditLog: false,
      }
    );

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error),
      code: getErrorCode(error),
    };
  }
}
