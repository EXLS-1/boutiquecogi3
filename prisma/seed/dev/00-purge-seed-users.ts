// prisma/seed/dev/00-purge-seed-users.ts
// ============================================
// PURGE DES COMPTES SEED (exécuté en DEV uniquement, ordre 5 — avant tout)
// ============================================
// Écrase, élimine et détruit toutes les occurrences des comptes fictifs générés
// par les seeds ("Client RDC N", "SuperAdmin N", emails @boutiquecogi3.cd),
// y compris "Client 0" qui interférait avec le rôle SUPER_ADMIN.
//
// Le compte SUPER_ADMIN réel (SUPER_ADMIN_EMAIL) est explicitement PROTÉGÉ.
// Les relations User sont en onDelete: Cascade (schéma Prisma) ; les tables
// sans cascade (Order → SetNull, AuditLog → SetNull) sont nettoyées explicitement.

import { Seeder } from "../types";

/** Critères de détection des comptes seed. */
const SEED_EMAIL_DOMAIN = "@boutiquecogi3.cd";
const SEED_NAME_PATTERNS = ["Client RDC %", "SuperAdmin %", "SuperAdmin COGI seed%"];

export const PurgeSeedUsersSeeder: Seeder = {
  name: "dev:purge-seed-users",
  order: 5,
  async run(ctx) {
    ctx.logger.start(this.name);

    // 1. Identifier les comptes seed à détruire (hors SUPER_ADMIN réel).
    const protectedEmail = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();

    const seedUsers = await ctx.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { endsWith: SEED_EMAIL_DOMAIN } },
              ...SEED_NAME_PATTERNS.map((p) => ({ name: { startsWith: p.replace(/%$/, "") } })),
            ],
          },
          ...(protectedEmail ? [{ email: { not: protectedEmail } }] : []),
        ],
      },
      select: { id: true, email: true },
    });

    if (seedUsers.length === 0) {
      ctx.logger.info("✓ Aucun compte seed résiduel à purger.");
      ctx.logger.end(this.name);
      return;
    }

    const ids = seedUsers.map((u) => u.id);

    // 2. Destruction transactionnelle : enfants explicites puis User (cascades).
    await ctx.prisma.$transaction(async (tx) => {
      // 2a. Tables avec onDelete: SetNull ou sans cascade directe.
      await tx.couponUsage.deleteMany({ where: { userId: { in: ids } } });
      await tx.order.updateMany({ where: { userId: { in: ids } }, data: { userId: null } });

      // 2b. Product.user est en RESTRICT : réassignation des produits seed
      //     au SUPER_ADMIN réel (le catalogue est préservé, la propriété aussi).
      if (!protectedEmail) {
        throw new Error(
          "SUPER_ADMIN_EMAIL non défini — impossible de réassigner les produits avant purge."
        );
      }
      const admin = await tx.user.findUnique({
        where: { email: protectedEmail },
        select: { id: true },
      });
      if (!admin) {
        throw new Error(
          `SUPER_ADMIN ${protectedEmail} introuvable — le bootstrap:superadmin doit s'exécuter avant la purge.`
        );
      }
      await tx.product.updateMany({
        where: { userId: { in: ids } },
        data: { userId: admin.id },
      });

      // 2c. UserAudit.createdBy/updatedBy en RESTRICT implicite → nullification.
      await tx.userAudit.updateMany({
        where: { OR: [{ createdById: { in: ids } }, { updatedById: { in: ids } }] },
        data: { createdById: null, updatedById: null },
      });

      // 2b. Enfants en cascade — suppression explicite pour fiabilité.
      await tx.review.deleteMany({ where: { userId: { in: ids } } });
      await tx.address.deleteMany({ where: { userId: { in: ids } } });
      await tx.notification.deleteMany({ where: { userId: { in: ids } } });
      await tx.wishlistItem.deleteMany({ where: { wishlist: { userId: { in: ids } } } });
      await tx.wishlist.deleteMany({ where: { userId: { in: ids } } });
      await tx.cartItem.deleteMany({ where: { cart: { userId: { in: ids } } } });
      await tx.cart.deleteMany({ where: { userId: { in: ids } } });
      await tx.searchAnalytics.deleteMany({ where: { userId: { in: ids } } });

      // 2c. Auth & RBAC.
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      await tx.account.deleteMany({ where: { userId: { in: ids } } });
      await tx.permissionOverride.deleteMany({
        where: { roleAssignment: { userId: { in: ids } } },
      });
      await tx.roleAssignment.deleteMany({ where: { userId: { in: ids } } });

      // 2d. Satellites 1:1.
      await tx.twoFactor.deleteMany({ where: { userId: { in: ids } } });
      await tx.userSecurity.deleteMany({ where: { userId: { in: ids } } });
      await tx.userPreferences.deleteMany({ where: { userId: { in: ids } } });
      await tx.userQuota.deleteMany({ where: { userId: { in: ids } } });
      await tx.userAudit.deleteMany({ where: { userId: { in: ids } } });
      await tx.post.deleteMany({ where: { userId: { in: ids } } });
      await tx.dashboard.deleteMany({ where: { userId: { in: ids } } });

      // 2e. Destruction finale des Users seed (cascades restantes : Product draft, etc.).
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });

    ctx.logger.info(`✓ ${seedUsers.length} comptes seed purgés (Client RDC / SuperAdmin fictifs).`);
    ctx.logger.end(this.name);
  },
};
