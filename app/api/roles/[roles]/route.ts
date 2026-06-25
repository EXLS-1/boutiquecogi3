// app/api/roles/[role]/route.ts
// ============================================
// API ROUTE — DÉTAIL D'UN RÔLE SPÉCIFIQUE
// ============================================
// GET    : Récupère les détails complets d'un rôle
// PUT    : Remplace entièrement la configuration d'un rôle
// DELETE : Supprime définitivement un rôle personnalisé (hard-delete)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Permission,
  type Restriction,
  type ToggleState,
  type Role,
  invalidateRBACCache,
} from "@/lib/auth/rbac";
import {
  actionRequireSuperAdmin,
  actionRequireAdmin,
  AuthorizationError,
  withAudit,
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
      const { role } = await params;
      const sanitizedRole = sanitizeRoleInput(role);

      const roleConfig = await prisma.roleConfig.findUnique({
        where: { role: sanitizedRole },
        select: {
          id: true,
          role: true,
          level: true,
          description: true,
          permissions: true,
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
          `Le rôle '${sanitizedRole}' n'existe pas.`,
          "ROLE_NOT_FOUND",
          404,
        );
      }

      const isSuperAdmin = context.user.role === ROLES.SUPER_ADMIN;

      // Masque les données sensibles pour les non-SUPER_ADMIN
      const sanitizedResponse = {
        ...roleConfig,
        permissions: isSuperAdmin
          ? roleConfig.permissions
          : Object.keys(
              roleConfig.permissions as Record<string, unknown>,
            ).reduce(
              (acc, key) => {
                acc[key] = "HIDDEN";
                return acc;
              },
              {} as Record<string, string>,
            ),
        restrictions: isSuperAdmin
          ? roleConfig.restrictions
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
      const { role } = await params;
      const sanitizedRole = sanitizeRoleInput(role);

      const body = await request.json();
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

      // Protection des rôles système
      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' ne peut pas être modifié via cette API.`,
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

      const updated = await prisma.roleConfig.update({
        where: { role: sanitizedRole },
        data: updateData,
      });

      // Audit log
      await withAudit(
        "ROLE_UPDATE",
        "role_config",
        async () => ({ updatedRole: sanitizedRole }),
        updated.id,
      );

      // Invalidation cache
      invalidateRBACCache(sanitizedRole as Role);

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
      const { role } = await params;
      const sanitizedRole = sanitizeRoleInput(role);

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

      // Protection des rôles système
      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' ne peut pas être supprimé.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      // Vérifie qu'il n'y a pas d'utilisateurs avec ce rôle
      const userCount = await prisma.user.count({
        where: { role: sanitizedRole },
      });

      if (userCount > 0) {
        return createErrorResponse(
          `Impossible de supprimer le rôle '${sanitizedRole}' : ${userCount} utilisateur(s) associé(s).`,
          "ROLE_IN_USE",
          409,
        );
      }

      // Suppression définitive
      await prisma.roleConfig.delete({
        where: { role: sanitizedRole },
      });

      // Audit log
      await withAudit(
        "ROLE_HARD_DELETE",
        "role_config",
        async () => ({ deletedRole: sanitizedRole }),
        existing.id,
      );

      // Invalidation cache
      invalidateRBACCache(sanitizedRole as Role);

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
