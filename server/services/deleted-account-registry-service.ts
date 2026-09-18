// server/services/deleted-account-registry-service.ts
// ============================================
// DeletedAccountRegistryService — Registre interne des comptes supprimés
// ============================================
// Ce service permet de :
//   1. Lister les entrées du registre avec pagination, recherche et filtres
//   2. Consulter le snapshot complet d'une suppression
//   3. Restaurer un compte supprimé (annuler l'anonymisation)
//   4. Obtenir des statistiques sur le registre
//
// Sécurité : Toutes les opérations passent par withSecurePrisma
// RBAC requis : ADMIN+ (minRoleLevel: 2)
// Permissions : audit:view-logs (lecture), users:update (restauration)

import { Prisma } from "@prisma/client";
import { withSecurePrisma } from "@/server/core/secure-prisma";
import { PERMISSIONS } from "@/lib/auth/rbac";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import {
  listDeletedAccountsSchema,
  restoreDeletedAccountSchema,
  type ListDeletedAccountsInput,
  type RestoreDeletedAccountInput,
} from "@/lib/validations/account";

// ─── Erreur métier ─────────────────────────

export class DeletedAccountRegistryServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "DeletedAccountRegistryServiceError";
  }
}

// ─── Types exports ──────────────────────────

export interface DeletedAccountRegistryItem {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  /**
   * `DeletedAccountRegistry.deletedBy` est nullable en base
   * (`String? @db.Uuid` avec `onDelete: SetNull`) : un compte supprimé par un
   * utilisateur lui-même effacé depuis conserve donc `deletedBy === null`.
   */
  deletedBy: string | null;
  deletedByRole: string;
  reason: string;
  createdAt: Date;
  restoredAt: Date | null;
  restoredBy: string | null;
  restoreNote: string | null;
  /** Relation Prisma `deletedByUser` : l'auteur de la suppression, s'il existe encore. */
  deletedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface DeletedAccountRegistryDetail extends DeletedAccountRegistryItem {
  userSnapshot: unknown;
  metadata: unknown;
  /**
   * Compte supprimé (la cible, pas l'auteur). Il n'existe aucune relation Prisma
   * vers ce compte (`DeletedAccountRegistry` ne porte pas de FK vers lui) :
   * l'objet est donc dérivé de la ligne de registre (identité figée au moment
   * de la suppression) et de l'état de restauration.
   */
  deletedUser: {
    id: string;
    email: string;
    name: string | null;
    isDeleted: boolean;
  } | null;
}

// ─── Sélecteurs / mappers ───────────────────

/** La relation `deletedByUser` telle que sélectionnée (jamais l'auteur fantôme). */
const DELETED_BY_USER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const satisfies Prisma.UserSelect;

/** Ligne de registre minimale suffisante pour projeter la cible supprimée. */
interface RegistryIdentityRow {
  userId: string;
  userEmail: string;
  userName: string | null;
  restoredAt: Date | null;
}

/**
 * Projette le compte supprimé (cible) à partir de la ligne de registre.
 * `isDeleted` reste vrai tant que l'entrée n'a pas été restaurée : c'est
 * exactement la sémantique du registre (aucune suppression physique).
 */
function mapDeletedUser(
  row: RegistryIdentityRow,
): NonNullable<DeletedAccountRegistryDetail["deletedUser"]> {
  return {
    id: row.userId,
    email: row.userEmail,
    name: row.userName,
    isDeleted: row.restoredAt === null,
  };
}

/** Normalise la relation `deletedByUser` (undefined Prisma → null métier). */
function mapDeletedByUser(
  user: { id: string; name: string | null; email: string } | null | undefined,
): DeletedAccountRegistryItem["deletedByUser"] {
  return user ? { id: user.id, name: user.name, email: user.email } : null;
}

export interface ListDeletedAccountsResult {
  entries: DeletedAccountRegistryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DeletedAccountStats {
  totalDeleted: number;
  totalRestored: number;
  selfDeletions: number;
  adminDeletions: number;
  lastWeekDeletions: number;
  lastMonthDeletions: number;
}

// ─── Service ─────────────────────────────────

export const DeletedAccountRegistryService = {
  /**
   * Lister les entrées du registre avec pagination (Admin+)
   */
  async list(
    input?: Partial<ListDeletedAccountsInput>
  ): Promise<ListDeletedAccountsResult> {
    const parsed = listDeletedAccountsSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw new DeletedAccountRegistryServiceError(
        "Données de filtre invalides",
        "VALIDATION_ERROR"
      );
    }

    return withSecurePrisma(
      async (ctx) => {
        const { search, page, pageSize, sortBy, sortOrder } = parsed.data;

        const where: Record<string, unknown> = {};

        if (search.trim()) {
          const q = search.toLowerCase();
          where.OR = [
            { userEmail: { contains: q, mode: "insensitive" } },
            { userName: { contains: q, mode: "insensitive" } },
            { reason: { contains: q, mode: "insensitive" } },
            { deletedByRole: { contains: q, mode: "insensitive" } },
          ];
        }

        const orderBy: Record<string, string> = { [sortBy]: sortOrder };

        const [total, rawEntries] = await Promise.all([
          ctx.prisma.deletedAccountRegistry.count({ where }),
          ctx.prisma.deletedAccountRegistry.findMany({
            where,
            include: {
              // Relation réelle du modèle (l'auteur de la suppression).
              deletedByUser: { select: DELETED_BY_USER_SELECT },
            },
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ]);

        const entries: DeletedAccountRegistryItem[] = rawEntries.map(
          (entry) => ({
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
            deletedByUser: mapDeletedByUser(entry.deletedByUser),
          })
        );

        return {
          entries,
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS["audit:view-logs"]],
        auditLog: false,
      }
    );
  },

  /**
   * Récupérer les détails complets d'une entrée du registre (Admin+)
   */
  async getById(
    registryId: string
  ): Promise<DeletedAccountRegistryDetail> {
    return withSecurePrisma(
      async (ctx) => {
        const entry = await ctx.prisma.deletedAccountRegistry.findUnique({
          where: { id: registryId },
          include: {
            // Relation réelle du modèle (l'auteur de la suppression).
            deletedByUser: { select: DELETED_BY_USER_SELECT },
          },
        });

        if (!entry) {
          throw new DeletedAccountRegistryServiceError(
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
          deletedByUser: mapDeletedByUser(entry.deletedByUser),
          deletedUser: mapDeletedUser(entry),
        };
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS["audit:view-logs"]],
      }
    );
  },

  /**
   * Restaurer un compte supprimé (Admin+)
   *
   * Processus :
   * 1. Vérifier que l'entrée existe et n'a pas déjà été restaurée
   * 2. Restaurer les données personnelles (email, name) à partir du snapshot
   * 3. Remettre isDeleted = false, deletedAt = null, deletedBy = null
   * 4. Marquer l'entrée comme restaurée
   * 5. Audit log
   */
  async restore(
    input: RestoreDeletedAccountInput
  ): Promise<{ success: boolean; userEmail: string; message: string }> {
    const parsed = restoreDeletedAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new DeletedAccountRegistryServiceError(
        "Données invalides",
        "VALIDATION_ERROR"
      );
    }

    return withSecurePrisma(
      async (ctx) => {
        const { registryId, note } = parsed.data;

        const entry = await ctx.prisma.deletedAccountRegistry.findUnique({
          where: { id: registryId },
        });

        if (!entry) {
          throw new DeletedAccountRegistryServiceError(
            "Entrée du registre non trouvée",
            "NOT_FOUND"
          );
        }

        if (entry.restoredAt) {
          throw new DeletedAccountRegistryServiceError(
            "Ce compte a déjà été restauré",
            "ALREADY_RESTORED"
          );
        }

        const snapshot = entry.userSnapshot as Record<string, unknown>;
        const userSnapshot = snapshot?.user as Record<string, unknown> | undefined;

        if (!userSnapshot || !userSnapshot.email) {
          throw new DeletedAccountRegistryServiceError(
            "Snapshot utilisateur invalide ou corrompu",
            "INVALID_SNAPSHOT"
          );
        }

        const originalEmail = userSnapshot.email as string;
        const originalName = (userSnapshot.name as string) || null;
        const originalImage = (userSnapshot.image as string) || null;

        await ctx.prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: entry.userId },
            data: {
              email: originalEmail,
              name: originalName,
              image: originalImage,
            },
          });

          await tx.deletedAccountRegistry.update({
            where: { id: registryId },
            data: {
              restoredAt: new Date(),
              restoredBy: ctx.userId,
              restoreNote: note || null,
            },
          });

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
                userEmail: originalEmail,
                restoredBy: ctx.userId,
                restoredByRole: ctx.roleName,
                note: note || "Restauration via DeletedAccountRegistryService",
              }),
              ipAddress: "auto",
              createdAt: new Date(),
            },
          });
        });

        return {
          success: true,
          userEmail: originalEmail,
          message: `Compte ${originalEmail} restauré avec succès`,
        };
      },
      {
        minRoleLevel: 2,
        requiredPermissions: [PERMISSIONS["users:update"]],
        auditLog: true,
      }
    );
  },
};
