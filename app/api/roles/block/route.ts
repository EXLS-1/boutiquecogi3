// app/api/roles/block/route.ts
// ============================================
// API ROUTE — BLOCAGE DÉDIÉ D'UN RÔLE
// ============================================
// Endpoint spécifique pour le blocage d'un rôle avec audit complet.
// Méthode : POST (idempotent)
//
// PRINCIPES :
//   - SUPER_ADMIN uniquement (guard unique, pas de double auth)
//   - Audit : logAudit() fire-and-forget, jamais bloquant
//   - Types : isValidRole() type guard, aucun cast 'as Role'
//   - Cache : invalidateRBACCache après mutation
//   - Aucune wrapper d'audit (withAudit, withAuditContext) — supprimées

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role, invalidateRBACCache } from "@/lib/auth/rbac";
import {
  actionRequireSuperAdmin,
  AuthorizationError,
  logAudit
} from "@/lib/auth/server";

// ───────────────────────────────────────────
// 1. SCHEMA DE VALIDATION
// ───────────────────────────────────────────

const BlockRoleSchema = z.object({
  role: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z][A-Z0-9_]*$/, {
      message:
        "Format de rôle invalide (MAJUSCULES, lettres/chiffres/underscores).",
    }),
  reason: z.string().max(512).optional(),
  force: z.boolean().optional().default(false),
  reassignTo: z
    .string()
    .min(2)
    .max(32)
    .optional()
    .refine((val) => !val || Object.values(ROLES).includes(val), {
      // ← CORRIGÉ: suppression du cast 'as Role' inutile
      message: "Le rôle de réassignation doit être un rôle système valide.",
    }),
});

// ───────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────

function createErrorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { success: false, error: { message, code, details } },
    { status },
  );
}

function createSuccessResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function sanitizeRoleInput(role: string): string {
  return role
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_]/g, "");
}

/**
 * Type guard : vérifie si une string est un Role valide du système RBAC.
 * ← AJOUTÉ: alignement avec route.ts corrigé
 */
function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

// ───────────────────────────────────────────
// 3. POST — Blocage d'un rôle avec audit
// ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return createErrorResponse(
          "Corps de requête JSON invalide.",
          "INVALID_JSON",
          400,
        );
      }

      const parsed = BlockRoleSchema.safeParse(body);

      if (!parsed.success) {
        return createErrorResponse(
          "Données invalides.",
          "VALIDATION_ERROR",
          400,
          parsed.error.flatten(),
        );
      }

      const { role, reason, force, reassignTo } = parsed.data;
      const sanitizedRole = sanitizeRoleInput(role);

      // ── Validation stricte du rôle cible ──
      if (!isValidRole(sanitizedRole)) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'est pas valide.`,
          "INVALID_ROLE",
          400,
        );
      }

      // ── Vérification existence ──
      const existing = await prisma.roleConfig.findUnique({
        where: { role: sanitizedRole },
      });

      if (!existing) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'existe pas.`,
          "ROLE_NOT_FOUND",
          404,
        );
      }

      // ── Protection rôles système ──
      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' est protégé et ne peut pas être bloqué.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      // ── Vérification déjà bloqué ──
      if (!existing.isActive) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' est déjà bloqué.`,
          "ROLE_ALREADY_BLOCKED",
          409,
        );
      }

      // ── Vérification utilisateurs actifs ──
      const activeUsers = await prisma.user.findMany({
        where: { role: sanitizedRole },
        select: { id: true, email: true, name: true },
      });

      if (activeUsers.length > 0 && !force) {
        return createErrorResponse(
          `Impossible de bloquer le rôle '${sanitizedRole}' : ${activeUsers.length} utilisateur(s) actif(s). Utilisez force=true pour forcer (avec réassignation obligatoire) ou reassignez manuellement.`,
          "ROLE_IN_USE",
          409,
          {
            affectedUsers: activeUsers.map((u) => ({
              id: u.id,
              email: u.email,
            })),
          },
        );
      }

      // ── Réassignation forcée si demandée ──
      let reassignedCount = 0;
      let targetRole: Role | null = null;

      if (force && activeUsers.length > 0) {
        if (!reassignTo) {
          return createErrorResponse(
            "Le paramètre 'reassignTo' est obligatoire lors d'un blocage forcé avec utilisateurs actifs.",
            "REASSIGNMENT_REQUIRED",
            400,
          );
        }

        const sanitizedReassign = sanitizeRoleInput(reassignTo);

        // ← AJOUTÉ: validation stricte du rôle de réassignation
        if (!isValidRole(sanitizedReassign)) {
          return createErrorResponse(
            `Le rôle de réassignation '${sanitizedReassign}' n'est pas valide.`,
            "INVALID_REASSIGNMENT_ROLE",
            400,
          );
        }

        // ← AJOUTÉ: empêcher la réassignation vers le même rôle
        if (sanitizedReassign === sanitizedRole) {
          return createErrorResponse(
            "Le rôle de réassignation ne peut pas être identique au rôle bloqué.",
            "SELF_REASSIGNMENT_FORBIDDEN",
            400,
          );
        }

        const targetRoleConfig = await prisma.roleConfig.findUnique({
          where: { role: sanitizedReassign },
        });

        if (!targetRoleConfig || !targetRoleConfig.isActive) {
          return createErrorResponse(
            `Le rôle de réassignation '${sanitizedReassign}' n'existe pas ou est inactif.`,
            "INVALID_REASSIGNMENT_ROLE",
            400,
          );
        }

        // Réassigne tous les utilisateurs
        const updateResult = await prisma.user.updateMany({
          where: { role: sanitizedRole },
          data: { role: sanitizedReassign },
        });

        reassignedCount = updateResult.count;
        targetRole = sanitizedReassign;

        // Invalide le cache pour les rôles concernés
        invalidateRBACCache(sanitizedRole); // ← CORRIGÉ: pas de 'as Role'
        invalidateRBACCache(sanitizedReassign); // ← CORRIGÉ: pas de 'as Role'
      }

      // ── Blocage effectif ──
      let blocked;
      try {
        blocked = await prisma.roleConfig.update({
          where: { role: sanitizedRole },
          data: {
            isActive: false,
            blockedAt: new Date(),
            blockedReason: reason ?? "Bloqué par décision administrative",
            blockedBy: context.user.id,
            updatedBy: context.user.id,
          },
        });
      } catch (dbError) {
        // ← AJOUTÉ: audit explicite de l'échec DB
        logAudit({
          userId: context.user.id,
          role: context.user.role,
          action: "ROLE_BLOCK",
          resource: "role_config",
          resourceId: existing.id,
          success: false,
          details: dbError instanceof Error ? dbError.message : String(dbError),
        });
        throw dbError;
      }

      // ── Audit log succès (fire-and-forget) ──
      logAudit({
        userId: context.user.id,
        role: context.user.role,
        action: "ROLE_BLOCK",
        resource: "role_config",
        resourceId: blocked.id,
        success: true,
        details: JSON.stringify({
          blockedRole: sanitizedRole,
          reason: reason ?? "Bloqué par décision administrative",
          reassignedUsers: reassignedCount,
          reassignTo: targetRole,
        }),
      });

      // ── Invalidation cache RBAC (si pas déjà fait dans réassignation) ──
      if (!targetRole) {
        invalidateRBACCache(sanitizedRole); // ← CORRIGÉ: pas de 'as Role'
      }

      return createSuccessResponse({
        id: blocked.id,
        role: blocked.role,
        level: blocked.level,
        isActive: blocked.isActive,
        blockedAt: blocked.blockedAt,
        blockedReason: blocked.blockedReason,
        reassignedUsers: reassignedCount,
        reassignTo: targetRole,
        message: `Le rôle '${sanitizedRole}' a été bloqué avec succès.${reassignedCount > 0 ? ` ${reassignedCount} utilisateur(s) réassigné(s) vers '${targetRole}'.` : ""}`,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLES_BLOCK_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors du blocage du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
