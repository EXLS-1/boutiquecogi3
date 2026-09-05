import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utils/uuid"; // Fix typo: utills -> utils
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Role,
  type Permission,
  type Restriction,
  type ToggleState,
} from "@/lib/auth/rbac";

function createPermissions(
  overrides: Partial<Record<Permission, ToggleState>> = {},
  defaultState: ToggleState = "OFF",
): Record<Permission, ToggleState> {
  const base = Object.fromEntries(
    Object.values(PERMISSIONS).map((p) => [p, defaultState]),
  ) as Record<Permission, ToggleState>;
  return { ...base, ...overrides };
}

function createRestrictions(
  overrides: Partial<Record<Restriction, string | ToggleState>> = {},
  defaultState: string | ToggleState = "OFF",
): Record<Restriction, string | ToggleState> {
  const base = Object.fromEntries(
    Object.values(RESTRICTIONS).map((r) => [r, defaultState]),
  ) as Record<Restriction, string | ToggleState>;
  return { ...base, ...overrides };
}

type RoleConfigPayload = {
  role: Role;
  level: number;
  description: string;
  permissions: Record<Permission, ToggleState>;
  restrictions: Record<Restriction, string | ToggleState>;
};

const ROLE_CONFIGS: RoleConfigPayload[] = [
  {
    role: ROLES.SUPER_ADMIN,
    level: 1,
    description: "Contrôle total de la plateforme.",
    permissions: createPermissions({}, "ON"),
    restrictions: createRestrictions({}, "OFF"),
  },
  {
    role: ROLES.ADMIN,
    level: 2,
    description: "Administration de l'application et des opérations critiques.",
    permissions: createPermissions({
      [PERMISSIONS['system:maintenance']]: "OFF",
      [PERMISSIONS['system:backup']]: "OFF",
      [PERMISSIONS['users:impersonate']]: "OFF",
      [PERMISSIONS['audit:switch-self']]: "ON",
      [PERMISSIONS['audit:switch-others']]: "OFF",
      [PERMISSIONS['audit:approve-request']]: "OFF",
      [PERMISSIONS['audit:view-logs']]: "ON",
    }, "ON"),
    restrictions: createRestrictions({
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "30",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "3,4,5,6",
      [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: "ON",
    }, "OFF"),
  },
  {
    role: ROLES.MANAGER,
    level: 3,
    description: "Gestion opérationnelle et supervision des équipes.",
    permissions: createPermissions({
      [PERMISSIONS['users:read']]: "ON",
      [PERMISSIONS['users:update']]: "ON",
      [PERMISSIONS['users:block']]: "ON",
      [PERMISSIONS['products:read']]: "ON",
      [PERMISSIONS['products:create']]: "ON",
      [PERMISSIONS['products:update']]: "ON",
      [PERMISSIONS['products:bulk-edit']]: "ON",
      [PERMISSIONS['products:import']]: "ON",
      [PERMISSIONS['orders:read']]: "ON",
      [PERMISSIONS['orders:update']]: "ON",
      [PERMISSIONS['orders:refund']]: "ON",
      [PERMISSIONS['orders:cancel']]: "ON",
      [PERMISSIONS['categories:read']]: "ON",
      [PERMISSIONS['categories:create']]: "ON",
      [PERMISSIONS['categories:update']]: "ON",
      [PERMISSIONS['analytics:read']]: "ON",
      [PERMISSIONS['analytics:export']]: "ON",
      [PERMISSIONS['reports:generate']]: "ON",
      [PERMISSIONS['settings:read']]: "ON",
      [PERMISSIONS['media:upload']]: "ON",
      [PERMISSIONS['media:delete']]: "ON",
      [PERMISSIONS['media:read']]: "ON",
      [PERMISSIONS['system:logs']]: "ON",
      [PERMISSIONS['content:read']]: "ON",
      [PERMISSIONS['content:create']]: "ON",
      [PERMISSIONS['content:update']]: "ON",
      [PERMISSIONS['content:publish']]: "ON",
      [PERMISSIONS['content:moderate']]: "ON",
      [PERMISSIONS['audit:switch-self']]: "ON",
      [PERMISSIONS['audit:switch-others']]: "OFF",
      [PERMISSIONS['audit:approve-request']]: "OFF",
      [PERMISSIONS['audit:view-logs']]: "OFF",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "100",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "500",
      [RESTRICTIONS.MAX_STORAGE_MB]: "2048",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "20",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_ACCESS_WEBHOOKS]: "ON",
      [RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.CAN_USE_BULK_ACTIONS]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "120",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "12",
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "20",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "4,5,6",
    }),
  },
  {
    role: ROLES.EDITOR,
    level: 4,
    description: "Édition de contenu et gestion de publication.",
    permissions: createPermissions({
      [PERMISSIONS['products:read']]: "ON",
      [PERMISSIONS['products:update']]: "ON",
      [PERMISSIONS['categories:read']]: "ON",
      [PERMISSIONS['analytics:read']]: "ON",
      [PERMISSIONS['media:upload']]: "ON",
      [PERMISSIONS['media:read']]: "ON",
      [PERMISSIONS['content:read']]: "ON",
      [PERMISSIONS['content:create']]: "ON",
      [PERMISSIONS['content:update']]: "ON",
      [PERMISSIONS['content:publish']]: "ON",
      [PERMISSIONS['audit:switch-self']]: "ON",
      [PERMISSIONS['audit:switch-others']]: "OFF",
      [PERMISSIONS['audit:approve-request']]: "OFF",
      [PERMISSIONS['audit:view-logs']]: "OFF",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "20",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "100",
      [RESTRICTIONS.MAX_STORAGE_MB]: "512",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "5",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "60",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
      [RESTRICTIONS.REQUIRES_AUDIT_APPROVAL]: "ON",
      [RESTRICTIONS.AUDIT_MAX_DURATION_MINUTES]: "15",
      [RESTRICTIONS.AUDIT_ALLOWED_TARGET_LEVELS]: "5,6",
    }),
  },
  {
    role: ROLES.SUPERVISOR,
    level: 5,
    description: "Supervision locale des opérations et du service client.",
    permissions: createPermissions({
      [PERMISSIONS['orders:read']]: "ON",
      [PERMISSIONS['orders:update']]: "ON",
      [PERMISSIONS['orders:cancel']]: "ON",
      [PERMISSIONS['products:read']]: "ON",
      [PERMISSIONS['analytics:read']]: "ON",
      [PERMISSIONS['reports:generate']]: "ON",
      [PERMISSIONS['media:read']]: "ON",
      [PERMISSIONS['content:read']]: "ON",
      [PERMISSIONS['content:moderate']]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "50",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "50",
      [RESTRICTIONS.MAX_STORAGE_MB]: "256",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_DEPARTMENT]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "45",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
    }),
  },
  {
    role: ROLES.USER,
    level: 6,
    description: "Utilisateur standard avec accès limité.",
    permissions: createPermissions({
      [PERMISSIONS['products:read']]: "ON",
      [PERMISSIONS['orders:read']]: "ON",
      [PERMISSIONS['orders:create']]: "ON",
      [PERMISSIONS['categories:read']]: "ON",
      [PERMISSIONS['media:read']]: "ON",
      [PERMISSIONS['content:read']]: "ON",
      [PERMISSIONS['settings:read']]: "ON",
    }),
    restrictions: createRestrictions({
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "5",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "0",
      [RESTRICTIONS.MAX_STORAGE_MB]: "50",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "1",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "20",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "4",
    }),
  },
];

export async function seedRoleConfigs(prisma: PrismaClient) {
  console.log("⚙️  [RBAC] Persistance des configurations de permissions...");

  for (const config of ROLE_CONFIGS) {
    const roleConfig = await prisma.roleConfig.upsert({
      where: { role: config.role },
      update: {
        level: config.level,
        description: config.description,
        restrictions: config.restrictions,
        isActive: true,
      },
      create: {
        id: generateUUIDv7(),
        role: config.role,
        level: config.level,
        description: config.description,
        restrictions: config.restrictions,
        isActive: true,
      },
    });

    // SOURCE DE VÉRITÉ : association normalisée RolePermission.
    // Le champ déprécié RoleConfig.permissions (JSON) n'est plus écrit.
    const grantedCodes = Object.entries(config.permissions)
      .filter(([, state]) => state === "ON")
      .map(([code]) => code);

    const permissions = await prisma.permission.findMany({
      where: { code: { in: grantedCodes } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({
      where: { roleconfigId: roleConfig.id },
    });
    if (permissions.length) {
      await prisma.rolePermission.createMany({
        data: permissions.map(({ id }) => ({
          roleconfigId: roleConfig.id,
          permissionId: id,
        })),
      });
    }

    console.log(
      `   ✓ ${config.role} (Level ${config.level}) — ${permissions.length} permissions (RolePermission).`,
    );
  }

  console.log(`⚙️  [RBAC] ${ROLE_CONFIGS.length} configurations de rôles synchronisées.`);
}