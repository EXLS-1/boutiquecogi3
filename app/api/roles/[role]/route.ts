// app/api/roles/[role]/route.ts
// ============================================
// API ROUTE — DÉTAIL D'UN RÔLE SPÉCIFIQUE
// ============================================
// GET    : Récupère les détails complets d'un rôle
// PUT    : Remplace entièrement la configuration d'un rôle
// DELETE : Supprime définitivement un rôle personnalisé (hard-delete)
//
// PRINCIPES :
//   - Guards : actionRequireAdmin / actionRequireSuperAdmin (auth unique)
//   - Audit  : logAudit() fire-and-forget, jamais bloquant
//   - Cache  : invalidateRBACCache après mutation
//   - Aucune wrapper d'audit (withAudit, withAuditContext) — supprimées

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Permission,
  type Restriction,
  type Role,
  invalidateRBACCache,
} from "@/lib/auth/rbac";
import {
  actionRequireSuperAdmin,
  actionRequireAdmin,
  AuthorizationError,
  logAudit
} from "@/lib/auth/server";

// ───────────────────────────────────────────
// 1. SCHEMAS DE VALIDATION
// ───────────────────────────────────────────

const ToggleStateSchema = z.enum(["ON", "OFF"]);

const PermissionOverrideSchema = z.record(
  z.enum(Object.values(PERMISSIONS) as [Permission, ...Permission[]]),
  ToggleStateSchema,
);

const RestrictionOverrideSchema = z.record(
  z.enum(Object.values(RESTRICTIONS) as [Restriction, ...Restriction[]]),
  z.union([ToggleStateSchema, z.string().min(1)]),
);

const UpdateRoleFullSchema = z.object({
  description: z.string().max(256).optional(),
  permissions: PermissionOverrideSchema.optional(),
  restrictions: RestrictionOverrideSchema.optional(),
  isActive: z.boolean().optional(),
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

function isValidRole(role: string): role is Role {
  return Object.values(ROLES).includes(role as Role);
}

// ───────────────────────────────────────────
// 3. PARAMÈTRES DE ROUTE
// ───────────────────────────────────────────

interface RouteParams {
  params: Promise<{ role: string }>;
}

// ───────────────────────────────────────────
// 4. GET — Détails d'un rôle
// ───────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    return await actionRequireAdmin(async (context) => {
      const { role: roleParam } = await params;
      const sanitizedRole = sanitizeRoleInput(roleParam);

      if (!isValidRole(sanitizedRole)) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'est pas valide.`,
          "INVALID_ROLE",
          400,
        );
      }

      const roleConfig = await prisma.roleConfig.findUnique({
        where: { role: sanitizedRole },
        select: {
          id: true,
          role: true,
          level: true,
          description: true,
          rolePermissions: { select: { permission: { select: { code: true } } } },
          restrictions: true,
          isActive: true,
          isSystem: true,
          blockedAt: true,
          blockedReason: true,
          blockedBy: true,
          unblockedAt: true,
          unblockedReason: true,
          createdAt: true,
          updatedAt: true,
          createdBy: true,
          updatedBy: true,
        },
      });

      if (!roleConfig) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'existe pas en base de données.`,
          "ROLE_NOT_FOUND",
          404,
        );
      }

      const isSuperAdmin = context.user.role === ROLES.SUPER_ADMIN;

      // Source de vérité : relation normalisée RolePermission → Permission.
      const grantedCodes = roleConfig.rolePermissions.map(
        (rp) => rp.permission.code,
      );
      const permissions = isSuperAdmin
        ? grantedCodes
        : grantedCodes.map(() => "HIDDEN");

      const sanitizedResponse = {
        ...roleConfig,
        permissions,
        restrictions: isSuperAdmin
          ? (roleConfig.restrictions as Record<string, unknown>)
          : Object.keys(
              roleConfig.restrictions as Record<string, unknown>,
            ).reduce(
              (acc, key) => {
                acc[key] = "HIDDEN";
                return acc;
              },
              {} as Record<string, string>,
            ),
      };

      return createSuccessResponse(sanitizedResponse);
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLE_DETAIL_GET_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la récupération du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ───────────────────────────────────────────
// 5. PUT — Remplacement complet d'un rôle
// ───────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const { role: roleParam } = await params;
      const sanitizedRole = sanitizeRoleInput(roleParam);

      if (!isValidRole(sanitizedRole)) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'est pas valide.`,
          "INVALID_ROLE",
          400,
        );
      }

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

      const parsed = UpdateRoleFullSchema.safeParse(body);
      if (!parsed.success) {
        return createErrorResponse(
          "Données invalides.",
          "VALIDATION_ERROR",
          400,
          parsed.error.flatten(),
        );
      }

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

      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' est protégé et ne peut pas être modifié.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      const data = parsed.data;
      const updateData: Record<string, unknown> = {};

      if (data.description !== undefined)
        updateData.description = data.description;
      if (data.permissions !== undefined)
        updateData.permissions = data.permissions as Record<string, unknown>;
      if (data.restrictions !== undefined)
        updateData.restrictions = data.restrictions as Record<string, unknown>;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      updateData.updatedBy = context.user.id;

      let updated;
      try {
        updated = await prisma.roleConfig.update({
          where: { role: sanitizedRole },
          data: updateData,
        });
      } catch (dbError) {
        logAudit({
          userId: context.user.id,
          role: context.user.role,
          action: "ROLE_UPDATE",
          resource: "role_config",
          resourceId: existing.id,
          success: false,
          details: dbError instanceof Error ? dbError.message : String(dbError),
        });
        throw dbError;
      }

      logAudit({
        userId: context.user.id,
        role: context.user.role,
        action: "ROLE_UPDATE",
        resource: "role_config",
        resourceId: updated.id,
        success: true,
        details: JSON.stringify({ updatedRole: sanitizedRole }),
      });

      invalidateRBACCache(sanitizedRole);

      return createSuccessResponse({
        id: updated.id,
        role: updated.role,
        level: updated.level,
        description: updated.description,
        isActive: updated.isActive,
        isSystem: updated.isSystem,
        updatedAt: updated.updatedAt,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLE_DETAIL_PUT_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la mise à jour du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ───────────────────────────────────────────
// 6. DELETE — Suppression définitive (hard-delete)
// ───────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const { role: roleParam } = await params;
      const sanitizedRole = sanitizeRoleInput(roleParam);

      if (!isValidRole(sanitizedRole)) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' n'est pas valide.`,
          "INVALID_ROLE",
          400,
        );
      }

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

      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' est protégé et ne peut pas être supprimé.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      const userCount = await prisma.user.count({
        where: { roleAssignment: { roleConfig: { role: sanitizedRole } } },
      });

      if (userCount > 0) {
        return createErrorResponse(
          `Impossible de supprimer : ${userCount} utilisateur(s) associé(s) au rôle '${sanitizedRole}'.`,
          "ROLE_IN_USE",
          409,
        );
      }

      try {
        await prisma.roleConfig.delete({
          where: { role: sanitizedRole },
        });
      } catch (dbError) {
        logAudit({
          userId: context.user.id,
          role: context.user.role,
          action: "ROLE_HARD_DELETE",
          resource: "role_config",
          resourceId: existing.id,
          success: false,
          details: dbError instanceof Error ? dbError.message : String(dbError),
        });
        throw dbError;
      }

      logAudit({
        userId: context.user.id,
        role: context.user.role,
        action: "ROLE_HARD_DELETE",
        resource: "role_config",
        resourceId: existing.id,
        success: true,
        details: JSON.stringify({ deletedRole: sanitizedRole }),
      });

      invalidateRBACCache(sanitizedRole);

      return createSuccessResponse({
        message: `Le rôle '${sanitizedRole}' a été supprimé définitivement.`,
        deletedRole: sanitizedRole,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLE_DETAIL_DELETE_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la suppression du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
