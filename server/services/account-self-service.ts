// server/services/account-self-service.ts
// ============================================
// AccountSelfService — Auto-suppression de compte utilisateur
// ============================================
// Permet à un utilisateur de supprimer SON PROPRE compte.
// La suppression est une soft-delete avec :
//   1. Snapshot complet des données dans DeletedAccountRegistry
//   2. Anonymisation des données personnelles
//   3. Désactivation du compte (isDeleted = true)
//   4. Audit log complet
//   5. Invalidations de session
//
// Sécurité : Vérification via BetterAuth signInEmail pour confirmer le mot de passe
// RBAC : L'utilisateur ne peut supprimer que son propre compte

import { withSecurePrisma } from "@/server/core/secure-prisma";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { auth } from "@/lib/auth";
import type { SelfDeleteAccountInput } from "@/lib/validations/account";
import { Prisma } from "@prisma/client";

// ─── Erreur métier ─────────────────────────

export class AccountSelfServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AccountSelfServiceError";
  }
}

// ─── Types ─────────────────────────────────

export interface SelfDeleteResult {
  success: true;
  message: string;
  deletedAt: string;
  registryId: string;
  anonymizedEmail: string;
}

// ─── Service ───────────────────────────────

export const AccountSelfService = {
  /**
   * Supprime son propre compte utilisateur.
   *
   * Processus :
   * 1. Vérifie que l'utilisateur connecté est bien celui qui demande la suppression
   * 2. Vérifie le mot de passe via BetterAuth si c'est un compte email
   * 3. Récupère un snapshot complet des données (User + Account + Orders + Addresses + etc.)
   * 4. Enregistre dans DeletedAccountRegistry
   * 5. Anonymise les données personnelles (email, name)
   * 6. Marque le compte comme supprimé (isDeleted = true)
   * 7. Crée un AuditLog
   * 8. Vide les sessions
   */
  async deleteMyAccount(
    input: SelfDeleteAccountInput
  ): Promise<SelfDeleteResult> {
    return withSecurePrisma(
      async (ctx) => {
        const { reason, password, confirmation } = input;

        if (!confirmation) {
          throw new AccountSelfServiceError(
            "Vous devez confirmer la suppression",
            "CONFIRMATION_REQUIRED"
          );
        }

        // 1. Récupérer l'utilisateur complet avec ses relations
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.userId },
          include: {
            accounts: true,
            sessions: true,
            addresses: true,
            orders: {
              include: {
                items: true,
                payment: true,
              },
            },
            roleAssignment: true,
            wishlist: {
              include: {
                items: true,
              },
            },
            cart: {
              include: {
                items: true,
              },
            },
            notifications: true,
          },
        });

        if (!user) {
          throw new AccountSelfServiceError(
            "Utilisateur non trouvé",
            "USER_NOT_FOUND"
          );
        }

        if (user.isDeleted) {
          throw new AccountSelfServiceError(
            "Ce compte est déjà supprimé",
            "ALREADY_DELETED"
          );
        }

        // 2. Vérifier le mot de passe via BetterAuth (pour les comptes email)
        const emailAccount = user.accounts.find(
          (a) => a.type === "email" && a.provider === "email"
        );
        if (emailAccount) {
          try {
            const signInResult = await auth.api.signInEmail({
              body: {
                email: user.email,
                password,
              },
              headers: new Headers({ "content-type": "application/json" }),
            });
            if (!signInResult?.user) {
              throw new AccountSelfServiceError(
                "Mot de passe incorrect. La suppression est annulée.",
                "INVALID_PASSWORD"
              );
            }
          } catch (error) {
            if (error instanceof AccountSelfServiceError) throw error;
            throw new AccountSelfServiceError(
              "Mot de passe incorrect. La suppression est annulée.",
              "INVALID_PASSWORD"
            );
          }
        } else {
          // Compte OAuth/Social — pas de vérification mot de passe
          console.info(
            `[SELF_DELETE] Utilisateur OAuth ${ctx.userId} supprime son compte.`
          );
        }

        // 3. Construire le snapshot des données utilisateur
        const userSnapshot: Prisma.InputJsonValue = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
            image: user.image,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          accounts: user.accounts.map((a) => ({
            id: a.id,
            provider: a.provider,
            type: a.type,
            providerAccountId: a.providerAccountId,
          })),
          addresses: user.addresses.map((a) => ({
            id: a.id,
            label: a.label,
            street: a.street,
            commune: a.commune,
            city: a.city,
            country: a.country,
            phone: a.phone,
            isDefault: a.isDefault,
          })),
          orders: user.orders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            grandTotal: o.grandTotal,
            currency: o.currency,
            createdAt: o.createdAt.toISOString(),
            items: o.items.map((i) => ({
              id: i.id,
              productName: i.productName,
              variantSku: i.variantSku,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          })),
          roleAssignment: user.roleAssignment
            ? {
                role: user.roleAssignment.role,
                assignedAt: user.roleAssignment.assignedAt.toISOString(),
              }
            : null,
          wishlist: user.wishlist
            ? {
                items: user.wishlist.items.map((i) => ({
                  productId: i.productId,
                  addedAt: i.addedAt.toISOString(),
                })),
              }
            : null,
        };

        // 4. Anonymiser les données personnelles
        const anonymizedSuffix = `deleted-${user.id.slice(0, 8)}`;
        const anonymizedEmail = `${anonymizedSuffix}@anonymized.cogi`;
        const anonymizedName = `Utilisateur supprimé (${anonymizedSuffix})`;

        // 5. Tout faire dans une transaction Prisma
        const result = await ctx.prisma.$transaction(async (tx) => {
          // 5a. Créer l'entrée dans le registre
          const registryEntry = await tx.deletedAccountRegistry.create({
            data: {
              id: generateUUIDv7(),
              userId: ctx.userId,
              userEmail: user.email,
              userName: user.name,
              deletedBy: ctx.userId,
              deletedByRole: ctx.roleName,
              userSnapshot,
              reason,
              metadata: {
                ip: "auto",
                deletedByAdmin: false,
                selfDelete: true,
                timestamp: new Date().toISOString(),
              },
            },
          });

          // 5b. Anonymiser le user (soft-delete)
          await tx.user.update({
            where: { id: ctx.userId },
            data: {
              email: anonymizedEmail,
              name: anonymizedName,
              image: null,
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy: ctx.userId,
            },
          });

          // 5c. Supprimer les sessions actives
          await tx.session.deleteMany({
            where: { userId: ctx.userId },
          });

          // 5d. Nettoyer les tokens d'authentification
          for (const account of user.accounts) {
            await tx.account.update({
              where: { id: account.id },
              data: {
                password: null,
                refresh_token: null,
                access_token: null,
                id_token: null,
              },
            });
          }

          // 5e. Créer un audit log
          await tx.auditLog.create({
            data: {
              id: generateUUIDv7(),
              userId: ctx.userId,
              roleLevel: ctx.roleLevel,
              action: "ACCOUNT_SELF_DELETED",
              targetId: ctx.userId,
              targetType: "USER",
              details: JSON.stringify({
                reason,
                anonymizedEmail,
                hasOrders: user.orders.length > 0,
                hasAddresses: user.addresses.length > 0,
                registryId: registryEntry.id,
              }),
              ipAddress: "auto",
              createdAt: new Date(),
            },
          });

          return registryEntry;
        });

        return {
          success: true,
          message:
            "Votre compte a été supprimé avec succès. Toutes vos données personnelles ont été anonymisées. Un registre interne conserve une trace pour des raisons légales et de traçabilité.",
          deletedAt: new Date().toISOString(),
          registryId: result.id,
          anonymizedEmail,
        };
      },
      {
        minRoleLevel: 7, // Tous les utilisateurs authentifiés peuvent supprimer leur compte
        auditLog: false, // On gère l'audit manuellement dans la transaction
      }
    );
  },

  /**
   * Vérifie si un utilisateur est éligible à la suppression.
   */
  async canDeleteAccount(userId: string): Promise<{
    canDelete: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          where: {
            status: {
              in: ["PENDING", "PROCESSING", "SHIPPED"],
            },
          },
          take: 1,
        },
      },
    });

    if (!user) {
      return { canDelete: false, reasons: ["Utilisateur non trouvé"] };
    }

    if (user.isDeleted) {
      reasons.push("Ce compte est déjà supprimé");
      return { canDelete: false, reasons };
    }

    if (user.orders.length > 0) {
      reasons.push(
        "Vous avez des commandes en cours (en attente, en traitement ou expédiées). Veuillez attendre leur finalisation."
      );
    }

    return {
      canDelete: reasons.length === 0,
      reasons,
    };
  },

  /**
   * Récupère l'historique des suppressions d'un utilisateur
   */
  async getDeletionHistory(userId: string) {
    const entries = await prisma.deletedAccountRegistry.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        restoredAt: true,
        restoreNote: true,
      },
    });

    return entries;
  },
};
