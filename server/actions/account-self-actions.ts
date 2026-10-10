// server/actions/account-self-actions.ts
// ============================================
// Server Actions pour l'auto-suppression de compte utilisateur
// ============================================

"use server";

import {
  AccountSelfService,
  AccountSelfServiceError,
} from "@/server/services/account-self-service";
import { selfDeleteAccountSchema } from "@/lib/validations/account.schema";
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

function parseConfirmationValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "on" ||
    normalized === "yes"
  );
}

function formEntryToString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Erreur serveur inattendue";
}

// ─── fieldErrors guard (Zod flatten() may yield undefined values) ───

function toFieldErrors(
  fieldErrors: Record<string, string[] | undefined>
): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) normalized[key] = messages;
  }
  return normalized;
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
      reason: formEntryToString(raw.reason),
      password: formEntryToString(raw.password),
      confirmation: parseConfirmationValue(raw.confirmation),
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
