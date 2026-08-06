// app/api/roles/route.ts
// ============================================
// API ROUTE — GESTION DES RÔLES (CRUD + LISTING)
// ============================================
// Point d'entrée RESTful pour la gestion des rôles.
// GET  : Liste paginée des rôles avec statut actif/inactif
// POST : Création d'un nouveau rôle personnalisé
// PATCH : Mise à jour d'un rôle (permissions, restrictions, statut)
// DELETE : Blocage (soft-delete) d'un rôle

import { NextRequest, NextResponse } from "next/server";
import { Prisma, type Role as PrismaRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Permission,
  type Restriction,
  invalidateRBACCache,
} from "@/lib/auth/rbac";
import {
  actionRequireSuperAdmin,
  actionRequireAdmin,
  AuthorizationError,
} from "@/lib/auth/server";

// ───────────────────────────────────────────
// 1. SCHEMAS DE VALIDATION ZOD
// ───────────────────────────────────────────

const ToggleStateSchema = z.enum(["ON", "OFF"]);
const PrismaRoleValues = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EDITOR", "SUPERVISOR", "USER"] as const;

const PermissionOverrideSchema = z.record(
  z.enum(Object.values(PERMISSIONS) as [Permission, ...Permission[]]),
  ToggleStateSchema,
);

const RestrictionOverrideSchema = z.record(
  z.enum(Object.values(RESTRICTIONS) as [Restriction, ...Restriction[]]),
  z.union([ToggleStateSchema, z.string().min(1)]),
);

const CreateRoleSchema = z.object({
  role: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z][A-Z0-9_]*$/, {
      message:
        "Le nom du rôle doit être en MAJUSCULES, commencer par une lettre, et ne contenir que des lettres, chiffres et underscores.",
    }),
  level: z.number().int().min(1).max(7),
  description: z.string().max(256).optional(),
  permissions: PermissionOverrideSchema.optional().default({} as z.infer<typeof PermissionOverrideSchema>),
  restrictions: RestrictionOverrideSchema.optional().default({} as z.infer<typeof RestrictionOverrideSchema>),
  isActive: z.boolean().optional().default(true),
});

const UpdateRoleSchema = z.object({
  role: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z][A-Z0-9_]*$/),
  description: z.string().max(256).optional(),
  permissions: PermissionOverrideSchema.optional(),
  restrictions: RestrictionOverrideSchema.optional(),
  isActive: z.boolean().optional(),
});

const BlockRoleSchema = z.object({
  role: z.string().min(2).max(32),
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

function sanitizeRoleInput(role: string): PrismaRole | null {
  const normalized = role.toUpperCase().trim().replace(/[^A-Z0-9_]/g, "");

  if (normalized === "GUEST") {
    return "USER";
  }

  return (PrismaRoleValues as readonly string[]).includes(normalized)
    ? (normalized as PrismaRole)
    : null;
}

// ───────────────────────────────────────────
// 3. GET — Liste des rôles (paginée, filtrable)
// ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    return await actionRequireAdmin(async (context) => {
      const { searchParams } = new URL(request.url);

      const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
      );
      const includeInactive = searchParams.get("includeInactive") === "true";
      const search = searchParams.get("search")?.trim();

      const where: Record<string, unknown> = {};

      if (!includeInactive) {
        where.isActive = true;
      }

      if (search) {
        where.OR = [
          { role: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const [roles, total] = await Promise.all([
        prisma.roleConfig.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ level: "asc" }, { role: "asc" }],
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
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.roleConfig.count({ where }),
      ]);

      const isSuperAdmin = context.user.role === ROLES.SUPER_ADMIN;

      // Masque les données sensibles pour les non-SUPER_ADMIN
      const sanitizedRoles = roles.map((r) => ({
        ...r,
        permissions: isSuperAdmin
          ? r.permissions
          : Object.keys(r.permissions as Record<string, unknown>).reduce(
              (acc, key) => {
                acc[key] = "HIDDEN";
                return acc;
              },
              {} as Record<string, string>,
            ),
        restrictions: isSuperAdmin
          ? r.restrictions
          : Object.keys(r.restrictions as Record<string, unknown>).reduce(
              (acc, key) => {
                acc[key] = "HIDDEN";
                return acc;
              },
              {} as Record<string, string>,
            ),
      }));

      return createSuccessResponse({
        roles: sanitizedRoles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLES_GET_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la récupération des rôles.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ───────────────────────────────────────────
// 4. POST — Création d'un rôle
// ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const body = await request.json();
      const parsed = CreateRoleSchema.safeParse(body);

      if (!parsed.success) {
        return createErrorResponse(
          "Données invalides.",
          "VALIDATION_ERROR",
          400,
          parsed.error.flatten(),
        );
      }

      const data = parsed.data;
      const sanitizedRole = sanitizeRoleInput(data.role);

      if (!sanitizedRole) {
        return createErrorResponse(
          "Le nom du rôle n'est pas pris en charge par la base de données.",
          "INVALID_ROLE",
          400,
        );
      }

      // Vérifie que le rôle n'est pas un rôle système protégé
      const systemRoles = Object.values(ROLES) as string[];
      if (systemRoles.includes(sanitizedRole)) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' est un rôle système et ne peut pas être recréé.`,
          "SYSTEM_ROLE_PROTECTED",
          409,
        );
      }

      // Vérifie l'unicité
      const existing = await prisma.roleConfig.findUnique({
        where: { role: sanitizedRole },
      });

      if (existing) {
        return createErrorResponse(
          `Le rôle '${sanitizedRole}' existe déjà.`,
          "ROLE_ALREADY_EXISTS",
          409,
        );
      }

      // Vérifie que le niveau n'est pas déjà utilisé par un rôle système
      const levelConflict = await prisma.roleConfig.findFirst({
        where: {
          level: data.level,
          isSystem: true,
          isActive: true,
        },
      });

      if (levelConflict) {
        return createErrorResponse(
          `Le niveau ${data.level} est déjà attribué au rôle système '${levelConflict.role}'.`,
          "LEVEL_CONFLICT",
          409,
        );
      }

      const roleConfig = await prisma.roleConfig.create({
        data: {
          id: generateUUIDv7(),
          role: sanitizedRole,
level: data.level,
          description: data.description ?? "",
          permissions: data.permissions as unknown as Prisma.InputJsonValue,
          restrictions: data.restrictions as unknown as Prisma.InputJsonValue,
          isActive: data.isActive,
          isSystem: false,
          createdBy: context.user.id,
        },
      });

      // Invalide le cache RBAC pour forcer le recalcul
      invalidateRBACCache(sanitizedRole as Parameters<typeof invalidateRBACCache>[0]);

      return createSuccessResponse(
        {
          id: roleConfig.id,
          role: roleConfig.role,
          level: roleConfig.level,
          description: roleConfig.description,
          isActive: roleConfig.isActive,
          isSystem: roleConfig.isSystem,
          createdAt: roleConfig.createdAt,
        },
        201,
      );
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLES_POST_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la création du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ───────────────────────────────────────────
// 5. PATCH — Mise à jour d'un rôle
// ───────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const body = await request.json();
      const parsed = UpdateRoleSchema.safeParse(body);

      if (!parsed.success) {
        return createErrorResponse(
          "Données invalides.",
          "VALIDATION_ERROR",
          400,
          parsed.error.flatten(),
        );
      }

      const data = parsed.data;
      const sanitizedRole = sanitizeRoleInput(data.role);

      if (!sanitizedRole) {
        return createErrorResponse(
          "Le nom du rôle n'est pas pris en charge par la base de données.",
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

      // Protection des rôles système
      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' ne peut pas être modifié via cette API.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      const updateData: Record<string, unknown> = {};

      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.permissions !== undefined) {
        updateData.permissions = data.permissions as unknown as Prisma.InputJsonValue;
      }
      if (data.restrictions !== undefined) {
        updateData.restrictions = data.restrictions as unknown as Prisma.InputJsonValue;
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive;
      }

      updateData.updatedBy = context.user.id;

      const updated = await prisma.roleConfig.update({
        where: { role: sanitizedRole },
        data: updateData,
      });

      // Invalide le cache RBAC
      invalidateRBACCache(sanitizedRole as Parameters<typeof invalidateRBACCache>[0]);

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
    console.error("[ROLES_PATCH_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors de la mise à jour du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}

// ───────────────────────────────────────────
// 6. DELETE — Blocage (soft-delete) d'un rôle
// ───────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    return await actionRequireSuperAdmin(async (context) => {
      const body = await request.json();
      const parsed = BlockRoleSchema.safeParse(body);

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

      if (!sanitizedRole) {
        return createErrorResponse(
          "Le nom du rôle n'est pas pris en charge par la base de données.",
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

      // Protection des rôles système
      if (existing.isSystem) {
        return createErrorResponse(
          `Le rôle système '${sanitizedRole}' ne peut pas être bloqué.`,
          "SYSTEM_ROLE_PROTECTED",
          403,
        );
      }

      // Vérifie qu'il n'y a pas d'utilisateurs actifs avec ce rôle
const activeUsersCount = await prisma.user.count({
        where: { roleConfigId: existing.id },
      });

      if (activeUsersCount > 0) {
        return createErrorResponse(
          `Impossible de bloquer le rôle '${sanitizedRole}' : ${activeUsersCount} utilisateur(s) actif(s) utilisent encore ce rôle. Veuillez d'abord réassigner ces utilisateurs.`,
          "ROLE_IN_USE",
          409,
        );
      }

      const blocked = await prisma.roleConfig.update({
        where: { role: sanitizedRole },
        data: {
          isActive: false,
          blockedAt: new Date(),
          blockedReason: reason ?? "Bloqué par décision administrative",
          blockedBy: context.user.id,
          updatedBy: context.user.id,
        },
      });

      // Invalide le cache RBAC
      invalidateRBACCache(sanitizedRole as Parameters<typeof invalidateRBACCache>[0]);

      return createSuccessResponse({
        id: blocked.id,
        role: blocked.role,
        level: blocked.level,
        isActive: blocked.isActive,
        blockedAt: blocked.blockedAt,
        blockedReason: blocked.blockedReason,
        message: `Le rôle '${sanitizedRole}' a été bloqué avec succès.`,
      });
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.message, error.code, error.statusCode);
    }
    console.error("[ROLES_DELETE_ERROR]", error);
    return createErrorResponse(
      "Erreur interne lors du blocage du rôle.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
