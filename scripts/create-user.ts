// Création d'un compte USER (Level 6) depuis USER_EMAIL / USER_PASSWORD / USER_NAME.

import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main(): Promise<void> {
  const email = process.env.USER_EMAIL?.trim().toLowerCase();
  const password = process.env.USER_PASSWORD;
  const name = process.env.USER_NAME?.trim();

  if (!email || !password || !name) {
    throw new Error("USER_EMAIL, USER_PASSWORD et USER_NAME doivent être définis dans .env.local.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Le format de USER_EMAIL est invalide.");
  }
  if (password.length < 8 || password.length > 128) {
    throw new Error("USER_PASSWORD doit contenir entre 8 et 128 caractères.");
  }

  const [{ prisma }, { hashPasswordWithBetterAuth, verifyBetterAuthPassword }] =
    await Promise.all([
      import("../lib/prisma"),
      import("../lib/auth/password-hash"),
    ]);

  try {
    const passwordHash = await hashPasswordWithBetterAuth(password);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const matches = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          role: true,
          status: true,
          userAudit: { select: { isDeleted: true } },
          userSecurity: { select: { isBlocked: true } },
          roleAssignment: {
            select: {
              isBlocked: true,
              roleConfig: { select: { role: true, level: true } },
            },
          },
        },
        take: 2,
      });
      if (matches.length > 1) {
        throw new Error(`Plusieurs comptes correspondent à "${email}". Corrigez les doublons avant de continuer.`);
      }

      let roleConfig = await tx.roleConfig.findUnique({
        where: { role: "USER" },
        select: { id: true, level: true, isActive: true },
      });
      if (!roleConfig) {
        roleConfig = await tx.roleConfig.create({
          data: {
            role: "USER",
            level: 6,
            description: "Rôle système Utilisateur",
            permissions: {},
            restrictions: {},
            isSystem: true,
            isActive: true,
          },
          select: { id: true, level: true, isActive: true },
        });
      } else if (roleConfig.level !== 6 || !roleConfig.isActive) {
        throw new Error("La configuration RBAC active du rôle USER (level 6) est absente ou invalide.");
      }

      const existing = matches[0];
      if (
        existing &&
        (existing.role !== "USER" ||
          existing.status !== "ACTIVE" ||
          existing.userAudit?.isDeleted ||
          existing.userSecurity?.isBlocked ||
          existing.roleAssignment?.isBlocked ||
          (existing.roleAssignment &&
            (existing.roleAssignment.roleConfig.role !== "USER" ||
              existing.roleAssignment.roleConfig.level !== 6)))
      ) {
        throw new Error(
          `Le compte existant "${email}" n'est pas un utilisateur USER actif non bloqué. Aucun changement n'a été effectué.`,
        );
      }

      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name, emailVerified: true, emailVerifiedAt: now },
          })
        : await tx.user.create({
            data: {
              email,
              name,
              emailVerified: true,
              emailVerifiedAt: now,
              status: "ACTIVE",
              role: "USER",
            },
          });

      await tx.account.upsert({
        where: {
          providerId_accountId: { providerId: "credential", accountId: user.id },
        },
        update: { password: passwordHash, updatedAt: now },
        create: {
          userId: user.id,
          type: "email",
          providerId: "credential",
          accountId: user.id,
          password: passwordHash,
        },
      });
      await tx.roleAssignment.upsert({
        where: { userId: user.id },
        update: { roleId: roleConfig.id, isBlocked: false, lastVerifiedAt: now },
        create: { userId: user.id, roleId: roleConfig.id },
      });
      await tx.userSecurity.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.userPreferences.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.userQuota.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      await tx.userAudit.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      if (existing) {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }

      return { user, updated: Boolean(existing) };
    }, { maxWait: 30_000, timeout: 60_000 });

    const saved = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        userAudit: { select: { isDeleted: true } },
        userSecurity: { select: { isBlocked: true } },
        roleAssignment: {
          select: {
            isBlocked: true,
            roleConfig: { select: { role: true, level: true } },
          },
        },
        accounts: {
          where: { providerId: "credential" },
          select: { password: true },
          take: 1,
        },
      },
    });
    const savedAccount = saved?.accounts[0];
    const passwordMatches =
      savedAccount?.password &&
      (await verifyBetterAuthPassword({
        hash: savedAccount.password,
        password,
      }));
    if (
      !saved ||
      saved.name !== name ||
      saved.role !== "USER" ||
      saved.status !== "ACTIVE" ||
      !saved.emailVerified ||
      saved.userAudit?.isDeleted ||
      saved.userSecurity?.isBlocked ||
      saved.roleAssignment?.isBlocked ||
      saved.roleAssignment?.roleConfig.role !== "USER" ||
      saved.roleAssignment.roleConfig.level !== 6 ||
      !passwordMatches
    ) {
      throw new Error("Vérification après écriture échouée pour le compte USER.");
    }

    console.log(
      `✓ Compte utilisateur ${result.updated ? "mis à jour" : "créé"} : ${result.user.email} (USER, level 6, actif).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Échec de la création de l'utilisateur :", error);
  process.exitCode = 1;
});
