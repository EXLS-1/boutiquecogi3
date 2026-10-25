// prisma/seed/dev/12-audit-logs.ts
// ============================================
// DÉVELOPPEMENT — TRACES D'AUDIT ADMIN
// ============================================
// Crée des journaux d'audit pour les actions admin. Idempotent via
// suppression/recréation (pas de clé unique naturelle).

import { Seeder } from "../types";
import { generateDeterministicUuidV7 } from "../utils/uuid";

const ACTIONS = [
  { action: "USER_LOGIN", entity: "USER" },
  { action: "PRODUCT_CREATE", entity: "PRODUCT" },
  { action: "ORDER_STATUS_CHANGE", entity: "ORDER" },
  { action: "ROLE_CHANGED", entity: "ROLE" },
  { action: "PERMISSION_OVERRIDE", entity: "PERMISSION" },
  { action: "SECURITY_ALERT", entity: "SECURITY" },
] as const;

export const DevAuditLogsSeeder: Seeder = {
  name: "dev:audit-logs",
  order: 120,
  async run(ctx) {
    ctx.logger.start(this.name);

    const users = await ctx.prisma.user.findMany({
      select: { id: true },
      take: 20,
    });

    if (users.length === 0) {
      ctx.logger.warn("Aucun utilisateur trouvé — exécuter dev:users d'abord.");
      return;
    }

    let auditCount = 0;

    for (let i = 0; i < 40; i++) {
      const user = users[i % users.length];
      const action = ACTIONS[i % ACTIONS.length];
      const auditId = generateDeterministicUuidV7("audit", i + 1);

      // `auditLog` has a compound unique constraint on (id, createdAt) at the
      // database level. Prisma exposes this as `AuditLogWhereUniqueInput` for
      // `upsert.where`, which requires `{ id_createdAt: { id, createdAt } }`.
      // `AuditLogWhereInput` does not expose `id_createdAt`, so we use
      // `upsert` (not `findFirst`+`update`) for the idempotent key.
      await ctx.prisma.auditLog.upsert({
        where: {
          id_createdAt: {
            id: auditId,
            createdAt: new Date(Date.now() - i * 3600000),
          },
        },
        update: {
          userId: user.id,
          roleLevel: (i % 6) + 1,
          action: action.action,
          entity: action.entity,
          entityType: action.entity,
          targetType: action.entity,
          details: JSON.stringify({ seed: "dev", reason: "Trace de démonstration" }),
          // Keep createdAt stable on update so the compound key doesn't change.
          createdAt: new Date(Date.now() - i * 3600000),
        },
        create: {
          id: auditId,
          userId: user.id,
          roleLevel: (i % 6) + 1,
          action: action.action,
          entity: action.entity,
          entityType: action.entity,
          targetType: action.entity,
          details: JSON.stringify({ seed: "dev", reason: "Trace de démonstration" }),
          createdAt: new Date(Date.now() - i * 3600000),
        },
      });
      auditCount++;
    }

    ctx.logger.info(`✓ AuditLogs (${auditCount})`);
    ctx.logger.end(this.name);
  },
};