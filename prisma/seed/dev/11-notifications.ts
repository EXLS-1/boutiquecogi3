// prisma/seed/dev/11-notifications.ts
// ============================================
// DÉVELOPPEMENT — CENTRE DE NOTIFICATIONS
// ============================================
// Crée des notifications pour les utilisateurs. Idempotent via
// suppression/recréation déterministe (pas de clé unique naturelle).

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";

const TYPES = [
  { type: "ORDER_STATUS", titles: ["Commande confirmée", "Commande expédiée", "Commande livrée"] },
  { type: "PROMOTION", titles: ["Nouvelle promotion", "Code promo disponible"] },
  { type: "WISHLIST", titles: ["Un article de votre liste est en promo"] },
  { type: "ACCOUNT", titles: ["Bienvenue chez BoutiqueCOGI3"] },
] as const;

export const DevNotificationsSeeder: Seeder = {
  name: "dev:notifications",
  order: 110,
  async run(ctx) {
    ctx.logger.start(this.name);

    const users = await ctx.prisma.user.findMany({
      where: { roleAssignment: { role: "USER" } },
      select: { id: true },
      take: 20,
    });

    if (users.length === 0) {
      ctx.logger.warn("Aucun utilisateur trouvé — exécuter dev:users d'abord.");
      return;
    }

    let notifCount = 0;

    for (let u = 0; u < users.length; u++) {
      const userId = users[u].id;
      for (let n = 0; n < 3; n++) {
        const template = TYPES[(u + n) % TYPES.length];
        const title = template.titles[(u + n) % template.titles.length];
        const notificationId = generateDeterministicUuidV7(`notif-${userId}-${n}`, u + n + 1);

        await ctx.prisma.notification.upsert({
          where: { id: notificationId },
          update: {
            userId,
            type: template.type,
            title,
            message: `Notification ${template.type} pour vous chez BoutiqueCOGI3.`,
            isRead: n % 3 === 0,
            createdAt: new Date(Date.now() - n * 86400000),
          },
          create: {
            id: notificationId,
            userId,
            type: template.type,
            title,
            message: `Notification ${template.type} pour vous chez BoutiqueCOGI3.`,
            isRead: n % 3 === 0,
            createdAt: new Date(Date.now() - n * 86400000),
          },
        });
        notifCount++;
      }
    }

    ctx.logger.info(`✓ Notifications (${notifCount})`);
    ctx.logger.end(this.name);
  },
};