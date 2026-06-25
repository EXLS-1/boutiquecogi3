// app/api/roles/unblock/route.ts
// ============================================
// API ROUTE — DÉBLOCAGE D'UN RÔLE
// ============================================
// Endpoint spécifique pour le déblocage (restauration) d'un rôle.
// Méthode : POST (idempotent)
//
// Règles :
//   - SUPER_ADMIN uniquement
//   - Vérifie que le rôle est bien bloqué
//   - Audit log automatique
//   - Invalidation du cache RBAC

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { type Role, invalidateRBACCache } from "@/lib/auth/rbac";
import {
  actionRequireSuperAdmin,
  AuthorizationError,
  withAudit,
} from "@/lib/auth/server";

// ───────────────────────────────────────────
// 1. SCHEMA DE VALIDATION
// ───────────────────────────────────────────

const UnblockRoleSchema = z.object({
  role: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z][A-Z0-9_]*$/, {
      message: "Format de rôle invalide.",
    }),
  reason: z.string().max(512).optional(),
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

// ───────────────────────────────────────────
// 3. POST — Déblocage d'un rôle
// ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const body = await request.json();
      const parsed = UnblockRoleSchema.safeParse(body);

      if (!parsed.success) {
        return createErrorResponse(
          "Données invalides.",
          "VALIDATION_ERROR",
          400,
          parsed.error.flatten(),
        );
      }

      const { role, reason } = parsed.data;
      const sanitizedRole = sanitizeRoleInput(role);

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

      // ── Vérifie que le rôle est bien bloqué ──
      if (existing.isActive) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' est déjà actif.`,
          "ROLE_ALREADY_ACTIVE",
          409,
        );
      }

      // ── Déblocage effectif ──
      const unblocked = await prisma.roleConfig.update({
        where: { role: sanitizedRole },
        data: {
          isActive: true,
          blockedAt: null,
          blockedReason: null,
          blockedBy: null,
          unblockedAt: new Date(),
          unblockedBy: context.user.id,
          unblockedReason: reason ?? "Débloqué par décision administrative",
          updatedBy: context.user.id,
        },
      });

      // ── Audit log ──
      await withAudit(
        "ROLE_UNBLOCK",
        "role_config",
        async () => {
          return {
            unblockedRole: sanitizedRole,
            reason: reason ?? "Débloqué par décision administrative",
          };
        },
        unblocked.id,
      );

      // ── Invalidation cache RBAC ──
      invalidateRBACCache(sanitizedRole as Role);

      return createSuccessResponse({
        id: unblocked.id,
        role: unblocked.role,
        level: unblocked.level,
        isActive: unblocked.isActive,
        unblockedAt: unblocked.unblockedAt,
        unblockedReason: unblocked.unblockedReason,
        message: `Le rôle '${sanitizedRole}' a été débloqué avec succès.`,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLES_UNBLOCK_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors du déblocage du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
