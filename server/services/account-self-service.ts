// server/services/account-self-service.ts
// ============================================
// AccountSelfService â€” Auto-suppression de compte utilisateur
// ============================================
// Permet Ã  un utilisateur de supprimer SON PROPRE compte.
// La suppression est une soft-delete avec :
//   1. Snapshot complet des données dans DeletedAccountRegistry
//   2. Anonymisation des donnÃ©es personnelles
//   3. Désactivation du compte (isDeleted = true)
//   4. Audit log complet
//   5. Invalidations de session
//
// SÃ©curitÃ© : VÃ©rification via BetterAuth signInEmail pour confirmer le mot de passe
// RBAC : L'utilisateur ne peut supprimer que son propre compte

import { withSecurePrisma } from "@/server/core/secure-prisma";
import { prisma } from "@/lib/prisma";
import { generateUUIDv7 } from "@/lib/utils/uuid";
import { auth } from "@/lib/auth";
import type { SelfDeleteAccountInput } from "@/lib/validations/account";
import { Prisma } from "@prisma/client";

// â”€â”€â”€ Erreur mÃ©tier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class AccountSelfServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "AccountSelfServiceError";
  }
}

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface SelfDeleteResult {
  success: true;
  message: string;
  deletedAt: string;
  registryId: string;
  anonymizedEmail: string;
}

// â”€â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AccountSelfService = {
  /**
   * Supprime son propre compte utilisateur.
   *
   * Processus :
   * 1. Vérifie que l'utilisateur connectÃ© est bien celui qui demande la suppression
   * 2. VÃ©rifie le mot de passe via BetterAuth si c'est un compte email
   * 3. Récupére un snapshot complet des donnÃ©es (User + Account + Orders + Addresses + etc.)
   * 4. Enregistre dans DeletedAccountRegistry
   * 5. Anonymise les donnÃ©es personnelles (email, name)
   * 6. Marque le compte comme supprimÃ© (isDeleted = true)
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

        // 1. RÃ©cupÃ©rer l'utilisateur complet avec ses relations
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
            userSecurity: true,
            roleConfig: true,
          },
        });

        if (!user) {
          throw new AccountSelfServiceError(
            "Utilisateur non trouvÃ©",
            "USER_NOT_FOUND"
          );
        }

        if (user.status === "DELETED") {
          throw new AccountSelfServiceError(
            "Ce compte est dÃ©jÃ  supprimÃ©",
            "ALREADY_DELETED"
          );
        }

        // 2. VÃ©rifier le mot de passe via BetterAuth (pour les comptes email)
        const emailAccount = user.accounts.find(
          (a) => a.type === "email" && a.providerId === "email"
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
                "Mot de passe incorrect. La suppression est annulÃ©e.",
                "INVALID_PASSWORD"
              );
            }
          } catch (error) {
            if (error instanceof AccountSelfServiceError) throw error;
            throw new AccountSelfServiceError(
              "Mot de passe incorrect. La suppression est annulÃ©e.",
              "INVALID_PASSWORD"
            );
          }
        } else {
          // Compte OAuth/Social â€” pas de vÃ©rification mot de passe
          console.info(
            `[SELF_DELETE] Utilisateur OAuth ${ctx.userId} supprime son compte.`
          );
        }

        // 3. Construire le snapshot des donnÃ©es utilisateur
        const userSnapshot: Prisma.InputJsonValue = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.roleConfig?.role ?? "GUEST",
            emailVerified: user.emailVerified,
            image: user.image,
            twoFactorEnabled: user.userSecurity?.twoFactorEnabled ?? false,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          accounts: user.accounts.map((a) => ({
            id: a.id,
            provider: a.providerId,
            type: a.type,
            providerAccountId: a.accountId,
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

        // 4. Anonymiser les donnÃ©es personnelles
        const anonymizedSuffix = `deleted-${user.id.slice(0, 8)}`;
        const anonymizedEmail = `${anonymizedSuffix}@anonymized.cogi`;
        const anonymizedName = `Utilisateur supprimÃ© (${anonymizedSuffix})`;

        // 5. Tout faire dans une transaction Prisma
        const result = await ctx.prisma.$transaction(async (tx) => {
          // 5a. CrÃ©er l'entrÃ©e dans le registre
          const registryEntry = await tx.deletedAccountRegistry.create({
            data: {
              id: generateUUIDv7(),
              userId: ctx.userId,
              userEmail: user.email,
              userName: user.name,
              deletedUser: ctx.userId,
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

          // 5e. CrÃ©er un audit log
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
            "Votre compte a Ã©tÃ© supprimÃ© avec succÃ¨s. Toutes vos donnÃ©es personnelles ont Ã©tÃ© anonymisÃ©es. Un registre interne conserve une trace pour des raisons lÃ©gales et de traÃ§abilitÃ©.",
          deletedAt: new Date().toISOString(),
          registryId: result.id,
          anonymizedEmail,
        };
      },
      {
        minRoleLevel: 7, // Tous les utilisateurs authentifiÃ©s peuvent supprimer leur compte
        auditLog: false, // On gÃ¨re l'audit manuellement dans la transaction
      }
    );
  },

  /**
   * VÃ©rifie si un utilisateur est Ã©ligible Ã  la suppression.
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
      return { canDelete: false, reasons: ["Utilisateur non trouvÃ©"] };
    }

    if (user.isDeleted) {
      reasons.push("Ce compte est dÃ©jÃ  supprimÃ©");
      return { canDelete: false, reasons };
    }

    if (user.orders.length > 0) {
      reasons.push(
        "Vous avez des commandes en cours (en attente, en traitement ou expÃ©diÃ©es). Veuillez attendre leur finalisation."
      );
    }

    return {
      canDelete: reasons.length === 0,
      reasons,
    };
  },

  /**
   * RÃ©cupÃ¨re l'historique des suppressions d'un utilisateur
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

