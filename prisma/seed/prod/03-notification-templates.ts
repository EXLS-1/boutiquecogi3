// prisma/seed/prod/03-notification-templates.ts
// ============================================
// PRODUCTION — MODÈLES DE NOTIFICATION SYSTÈME
// ============================================
// Injecte les modèles de notification système dans SystemConfiguration
// (table de référence clé/valeur disponible). Idempotent via clé unique.

import { Seeder } from "../types";
import { generateUUIDv7 } from "../utils/uuid";

const NOTIFICATION_TEMPLATES = [
  { key: "notification.template.order_confirmed", value: "Commande confirmée" },
  { key: "notification.template.order_shipped", value: "Commande expédiée" },
  { key: "notification.template.order_delivered", value: "Commande livrée" },
  { key: "notification.template.password_reset", value: "Réinitialisation de mot de passe" },
  { key: "notification.template.email_verification", value: "Vérification d'e-mail" },
  { key: "notification.template.welcome", value: "Bienvenue chez BoutiqueCOGI3" },
] as const;

export const ProdNotificationTemplatesSeeder: Seeder = {
  name: "prod:notification-templates",
  order: 30,
  async run(ctx) {
    ctx.logger.start(this.name);

    for (const t of NOTIFICATION_TEMPLATES) {
      await ctx.prisma.systemConfiguration.upsert({
        where: { key: t.key },
        update: { value: t.value },
        create: { id: generateUUIDv7(), key: t.key, value: t.value },
      });
    }

    ctx.logger.info(`✓ Notification templates (${NOTIFICATION_TEMPLATES.length})`);
    ctx.logger.end(this.name);
  },
};
</content>
