// prisma/seed/bootstrap/06-superadmin.ts
// ============================================
// RÉ-IMPLÉMENTATION GARANTIE DU SUPER_ADMIN (idempotent)
// ============================================
// Exécuté dans TOUS les environnements à chaque `prisma db seed`.
// Garantit que le compte défini par SUPER_ADMIN_EMAIL (ou INITIAL_SUPERADMIN_EMAIL)
// conserve ses privilèges SUPER_ADMIN (niveau 1), même après un reset/migration.
//
// CORRECTIF : seedUsers lisait uniquement INITIAL_SUPERADMIN_* alors que
// l'environnement définit SUPER_ADMIN_* — le rôle n'était jamais ré-appliqué.

import { Seeder } from "../types";
import { seedUsers } from "../users.seed";

function resolveSuperAdminEnv() {
  const email =
    process.env.SUPER_ADMIN_EMAIL || process.env.INITIAL_SUPERADMIN_EMAIL;
  const password =
    process.env.SUPER_ADMIN_PASSWORD || process.env.INITIAL_SUPERADMIN_PASSWORD;
  const name =
    process.env.SUPER_ADMIN_NAME || process.env.INITIAL_SUPERADMIN_NAME || "SuperAdmin COGI";
  return { email, password, name };
}

export const SuperAdminSeeder: Seeder = {
  name: "bootstrap:superadmin",
  order: 70,
  async run(ctx) {
    ctx.logger.start(this.name);

    const { email, password, name } = resolveSuperAdminEnv();

    if (!email || !password) {
      ctx.logger.warn(
        "SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD absents — réimplémentation du SUPER_ADMIN ignorée."
      );
      ctx.logger.end(this.name);
      return;
    }

    // En dev/test, un mot de passe de substitution trop court ne doit pas
    // faire échouer tout le seed : on saute proprement (prod exige ≥ 12 car).
    if (password.length < 12) {
      if (ctx.env === "production") {
        throw new Error(
          "❌ [SECURITY FATAL] Le mot de passe du SuperAdmin doit contenir au moins 12 caractères en production."
        );
      }
      ctx.logger.warn(
        `Mot de passe SUPER_ADMIN de substitution (${password.length} car < 12) — création du compte ignorée en ${ctx.env}. Définissez un mot de passe ≥ 12 caractères pour créer le compte.`
      );
      ctx.logger.end(this.name);
      return;
    }

    await seedUsers(ctx.prisma, { email, password, name, role: "SUPER_ADMIN" });

    ctx.logger.info(`✓ SUPER_ADMIN réimplémenté : ${email} (L1)`);
    ctx.logger.end(this.name);
  },
};
