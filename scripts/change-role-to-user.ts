import { config } from "dotenv";
import type { Role } from "@prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function getEmailArgument(): string {
  const emailArgument = process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--email="));
  const email = emailArgument?.slice("--email=".length).trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      'Fournissez une adresse valide avec --email=compte@exemple.com.',
    );
  }

  return email;
}

async function main(): Promise<void> {
  const email = getEmailArgument();
  const [{ prisma }, { buildRoleConfigSeeds }, { buildPermissionSeeds }] =
    await Promise.all([
      import("../lib/prisma"),
      import("../prisma/seed/shared/role-config"),
      import("../prisma/seed/shared/permissions"),
    ]);

  try {
    const roleSeeds = buildRoleConfigSeeds();
    const userRoleSeed = roleSeeds.find((seed) => seed.role === "USER");
    if (!userRoleSeed || userRoleSeed.level !== 6) {
      throw new Error(
        "La configuration RBAC canonique du rôle USER (level 6) est absente ou invalide.",
      );
    }

    const levelByRole = new Map<Role, number>(
      roleSeeds.map(({ role, level }) => [role, level]),
    );
    const permissionSeeds = buildPermissionSeeds();

    await prisma.$transaction(async (tx) => {
      const matchingUsers = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          userAudit: { select: { isDeleted: true } },
          roleAssignment: {
            select: {
              id: true,
              roleConfig: { select: { role: true, level: true } },
            },
          },
        },
        take: 2,
      });

      if (matchingUsers.length > 1) {
        throw new Error(
          `Plusieurs comptes utilisent une adresse équivalente à "${email}". Corrigez les doublons avant de continuer.`,
        );
      }

      const user = matchingUsers[0];
      if (!user) {
        throw new Error(`Aucun compte trouvé pour "${email}".`);
      }
      if (user.status === "DELETED" || user.userAudit?.isDeleted) {
        throw new Error(
          `Le compte "${user.email}" est supprimé et ne peut pas être modifié.`,
        );
      }

      const directLevel = levelByRole.get(user.role);
      const assignmentRole = user.roleAssignment?.roleConfig;
      const levels = [directLevel, assignmentRole?.level].filter(
        (level): level is number => level !== undefined,
      );
      const hasSuperAdminRole =
        user.role === "SUPER_ADMIN" ||
        assignmentRole?.role === "SUPER_ADMIN" ||
        levels.includes(1);

      if (hasSuperAdminRole) {
        throw new Error(
          `Le compte "${user.email}" possède ou est associé au rôle SUPER_ADMIN (level 1) et ne sera pas rétrogradé.`,
        );
      }

      const elevatedRole =
        (directLevel !== undefined && directLevel >= 2 && directLevel <= 5) ||
        (assignmentRole !== undefined &&
          assignmentRole.level >= 2 &&
          assignmentRole.level <= 5);
      if (!elevatedRole) {
        throw new Error(
          `Le compte "${user.email}" ne possède aucun rôle de niveau 2 à 5.`,
        );
      }

      for (const permission of permissionSeeds) {
        await tx.permission.upsert({
          where: { code: permission.code },
          update: {
            name: permission.name,
            description: permission.description,
            category: permission.category,
            isDangerous: permission.isDangerous,
          },
          create: permission,
        });
      }

      const roleConfig = await tx.roleConfig.upsert({
        where: { role: userRoleSeed.role },
        update: {
          level: userRoleSeed.level,
          description: userRoleSeed.description,
          restrictions: userRoleSeed.restrictions,
          isSystem: userRoleSeed.isSystem,
          isActive: userRoleSeed.isActive,
        },
        create: {
          role: userRoleSeed.role,
          level: userRoleSeed.level,
          description: userRoleSeed.description,
          restrictions: userRoleSeed.restrictions,
          isSystem: userRoleSeed.isSystem,
          isActive: userRoleSeed.isActive,
        },
      });

      const grantedCodes = Object.entries(userRoleSeed.permissions)
        .filter(([, state]) => state === "ON")
        .map(([code]) => code);
      const grantedPermissions = await tx.permission.findMany({
        where: { code: { in: grantedCodes } },
        select: { id: true, code: true },
      });
      const foundCodes = new Set(
        grantedPermissions.map(({ code }) => code),
      );
      const missingCodes = grantedCodes.filter((code) => !foundCodes.has(code));
      if (missingCodes.length > 0) {
        throw new Error(
          `Permissions RBAC absentes du catalogue pour USER : ${missingCodes.join(", ")}`,
        );
      }

      const grantedPermissionIds = grantedPermissions.map(({ id }) => id);
      await tx.rolePermission.deleteMany({
        where: {
          roleconfigId: roleConfig.id,
          ...(grantedPermissionIds.length > 0 && {
            permissionId: { notIn: grantedPermissionIds },
          }),
        },
      });
      if (grantedPermissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: grantedPermissionIds.map((permissionId) => ({
            roleconfigId: roleConfig.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      const now = new Date();
      if (user.roleAssignment) {
        await tx.permissionOverride.deleteMany({
          where: { roleAssignmentId: user.roleAssignment.id },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { role: "USER" },
      });
      await tx.roleAssignment.upsert({
        where: { userId: user.id },
        update: {
          roleId: roleConfig.id,
          assignedAt: now,
          lastVerifiedAt: now,
        },
        create: { userId: user.id, roleId: roleConfig.id },
      });
      await tx.userAudit.upsert({
        where: { userId: user.id },
        update: { version: { increment: 1 } },
        create: { userId: user.id },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({
        data: {
          roleLevel: 0,
          action: "USER_ROLE_CHANGED",
          targetId: user.id,
          targetType: "USER",
          entity: "USER",
          entityType: "USER",
          entityId: user.id,
          oldValue: {
            role: user.role,
            level: directLevel ?? assignmentRole?.level ?? null,
            assignedRole: assignmentRole?.role ?? null,
            assignedLevel: assignmentRole?.level ?? null,
          },
          newValue: { role: "USER", level: 6 },
          metadata: { source: "scripts/change-role-to-user.ts" },
          status: "SUCCESS",
        },
      });

      console.log(
        `✓ Compte rétrogradé : ${user.email} → USER (level 6).`,
      );
      console.log("  - Rôle direct et RoleAssignment synchronisés");
      console.log("  - Permissions résolues depuis le RBAC canonique");
      console.log("  - Overrides individuels supprimés");
      console.log("  - Sessions invalidées et changement audité");
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("❌ Échec de la rétrogradation :", error);
  process.exitCode = 1;
});
