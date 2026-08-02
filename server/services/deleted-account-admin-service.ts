// server/services/deleted-account-admin-service.ts
// ============================================
// DeletedAccountAdminService — Gestion admin du registre des comptes supprimés
// ============================================
// Sécurité : Toutes les opérations passent par withSecurePrisma
// RBAC requis : ADMIN+ (minRoleLevel: 2)
// Permissions : accounts:read, accounts:delete
// ============================================

import { withSecurePrisma } from "@/server/core/secure-prisma";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { prisma } from "@/lib/prisma";
import {
  listDeletedAccountsSchema,
  restoreDeletedAccountSchema,
  type ListDeletedAccountsInput,
  type RestoreDeletedAccountInput,
} from "@/lib/validations/account";
import { Prisma } from "@prisma/client";

// ─── Erreur métier ─────────────────────────

export class DeletedAccountAdminServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "DeletedAccountAdminServiceError";
  }
}

// ─── Types ──────────────────────────────────

export interface DeletedAccountRegistryItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  deletedBy: string;
  deletedByRole: string;
  reason: string;
  createdAt: Date;
  restoredAt: Date | null;
  restoredBy: string | null;
  restoreNote: string | null;
}

export interface DeletedAccountRegistryDetail extends DeletedAccountRegistryItem {
  userSnapshot: Prisma.JsonValue;
  metadata: Prisma.JsonValue | null;
}

export interface ListDeletedAccountsResult {
  entries: DeletedAccountRegistryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RegistryStats {
  totalDeleted: number;
  totalRestored: number;
  deletedToday: number;
  deletedThisWeek: number;
  deletedThisMonth: number;
}

// ─── Service ────────────────────────────────

export const DeletedAccountAdminService = {
  /**
   * Lister les entrées du registre avec pagination et recherche (Admin+)
   */
  async list(
    input?: Partial<ListDeletedAccountsInput>
  ): Promise<ListDeletedAccountsResult> {
    const parsed = listDeletedAccountsSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw new DeletedAccountAdminServiceError(
        "Données de filtre invalides",
        "VALIDATION_ERROR"
      );
    }

    return withSecurePrisma(
      async (ctx) => {
        const { search, page, pageSize, sortBy, sortOrder } = parsed.data;

        // Construction du filtre WHERE
        const where: Prisma.DeletedAccountRegistryWhereInput = {};

        if (search.trim()) {
          const q = search.toLowerCase();
          where.OR = [
            { userEmail: { contains: q, mode: "insensitive" } },
            { userName: { contains: q, mode: "insensitive" } },
            { reason: { contains: q, mode: "insensitive" } },
          ];
        }

        // Tri
        const orderBy: Prisma.DeletedAccountRegistryOrderByWithRelationInput = {
          [sortBy]: sortOrder,
        };

        // Requête parallèle : comptage + données
        const [total, entries] = await Promise.all([
          ctx.prisma.deletedAccountRegistry.count({ where }),
          ctx.prisma.deletedAccountRegistry.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            select: {
              id: true,
              userId: true,
              userEmail: true,
              userName: true,
              deletedBy: true,
              deletedByRole: true,
              reason: true,
              createdAt: true,
              restoredAt: true,
              restoredBy: true,
              restoreNote: true,
            },
          }),
        ]);

        return {
          entries,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS["users:view:any"]],
        auditLog: false,
      }
    );
  },

  /**
   * Récupérer les détails complets d'une entrée du registre (Admin+)
   */
  async getById(registryId: string): Promise<DeletedAccountRegistryDetail> {
    return withSecurePrisma(
      async (ctx) => {
        const entry = await ctx.prisma.deletedAccountRegistry.findUnique({
          where: { id: registryId },
        });

        if (!entry) {
          throw new DeletedAccountAdminServiceError(
            "Entrée du registre non trouvée",
            "NOT_FOUND"
          );
        }

        return {
          id: entry.id,
          userId: entry.userId,
          userEmail: entry.userEmail,
          userName: entry.userName,
          deletedBy: entry.deletedBy,
          deletedByRole: entry.deletedByRole,
          reason: entry.reason,
          createdAt: entry.createdAt,
          restoredAt: entry.restoredAt,
          restoredBy: entry.restoredBy,
          restoreNote: entry.restoreNote,
          userSnapshot: entry.userSnapshot,
          metadata: entry.metadata,
        };
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS["users:view:any"]],
        auditLog: true,
      }
    );
  },

  /**
   * Restaurer un compte supprimé (Admin+/Super Admin)
   */
  async restore(
    input: RestoreDeletedAccountInput
  ): Promise<{ success: boolean; registryId: string; userEmail: string }> {
    const parsed = restoreDeletedAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new DeletedAccountAdminServiceError(
        "Données invalides",
        "VALIDATION_ERROR"
      );
    }

    return withSecurePrisma(
      async (ctx) => {
        const { registryId, note } = parsed.data;

        // 1. Vérifier que l'entrée existe
        const entry = await ctx.prisma.deletedAccountRegistry.findUnique({
          where: { id: registryId },
        });

        if (!entry) {
          throw new DeletedAccountAdminServiceError(
            "Entrée du registre non trouvée",
            "NOT_FOUND"
          );
        }

        if (entry.restoredAt) {
          throw new DeletedAccountAdminServiceError(
            "Ce compte a déjà été restauré",
            "ALREADY_RESTORED"
          );
        }

        // 2. Restaurer dans une transaction
        const result = await ctx.prisma.$transaction(async (tx) => {
          // 2a. Restaurer le compte utilisateur
          await tx.user.update({
            where: { id: entry.userId },
            data: {
              email: entry.userEmail,
              name: entry.userName,
              image: null,
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
            },
          });

          // 2b. Marquer le registre comme restauré
          await tx.deletedAccountRegistry.update({
            where: { id: registryId },
            data: {
              restoredAt: new Date(),
              restoredBy: ctx.userId,
              restoreNote: note || null,
            },
          });

          // 2c. Audit log
          await tx.auditLog.create({
            data: {
              id: generateUUIDv7(),
              userId: ctx.userId,
              roleLevel: ctx.roleLevel,
              action: "ACCOUNT_RESTORED",
              targetId: entry.userId,
              targetType: "USER",
              details: JSON.stringify({
                registryId,
                userEmail: entry.userEmail,
                restoredBy: ctx.userId,
                restoredByRole: ctx.roleName,
                note: note || "Aucune note fournie",
              }),
              ipAddress: "auto",
              createdAt: new Date(),
            },
          });

          return entry;
        });

        return {
          success: true,
          registryId,
          userEmail: result.userEmail,
        };
      },
      {
        minRoleLevel: 2, // ADMIN+
        requiredPermissions: [PERMISSIONS["users:block"]],
        auditLog: true,
      }
    );
  },

  /**
   * Obtenir les statistiques du registre
   */
  async getStats(): Promise<RegistryStats> {
    return withSecurePrisma(
      async (ctx) => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfDay);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalDeleted, totalRestored, deletedToday, deletedThisWeek, deletedThisMonth] =
          await Promise.all([
            ctx.prisma.deletedAccountRegistry.count(),
            ctx.prisma.deletedAccountRegistry.count({
              where: { restoredAt: { not: null } },
            }),
            ctx.prisma.deletedAccountRegistry.count({
              where: { createdAt: { gte: startOfDay } },
            }),
            ctx.prisma.deletedAccountRegistry.count({
              where: { createdAt: { gte: startOfWeek } },
            }),
            ctx.prisma.deletedAccountRegistry.count({
              where: { createdAt: { gte: startOfMonth } },
            }),
          ]);

        return {
          totalDeleted,
          totalRestored,
          deletedToday,
          deletedThisWeek,
          deletedThisMonth,
        };
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS["users:view:any"]],
        auditLog: false,
      }
    );
  },
};
