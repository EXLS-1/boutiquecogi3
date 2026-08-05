import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/utills/uuid";
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
  permissions: Record<Permission, ToggleState>;
  restrictions: Record<Restriction, string | ToggleState>;
};

const ROLE_CONFIGS: RoleConfigPayload[] = [
  {
    role: ROLES.SUPER_ADMIN,
    level: 1,
    permissions: createPermissions({}, "ON"),
    restrictions: createRestrictions({}, "OFF"),
  },
  {
    role: ROLES.ADMIN,
    level: 2,
    permissions: createPermissions({
      [PERMISSIONS.SYSTEM_MAINTENANCE]: "OFF",
      [PERMISSIONS.SYSTEM_BACKUP]: "OFF",
      [PERMISSIONS.USERS_IMPERSONATE]: "OFF",
      [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "ON",
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
    permissions: createPermissions({
      [PERMISSIONS.USERS_READ]: "ON",
      [PERMISSIONS.USERS_UPDATE]: "ON",
      [PERMISSIONS.USERS_BAN]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_CREATE]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.PRODUCTS_BULK_EDIT]: "ON",
      [PERMISSIONS.PRODUCTS_IMPORT]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_REFUND]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.CATEGORIES_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_UPDATE]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_EXPORT]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_DELETE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.SYSTEM_LOGS]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "OFF",
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
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.PRODUCTS_UPDATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.MEDIA_UPLOAD]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_CREATE]: "ON",
      [PERMISSIONS.CONTENT_UPDATE]: "ON",
      [PERMISSIONS.CONTENT_PUBLISH]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_SELF]: "ON",
      [PERMISSIONS.AUDIT_SWITCH_OTHERS]: "OFF",
      [PERMISSIONS.AUDIT_APPROVE_REQUEST]: "OFF",
      [PERMISSIONS.AUDIT_VIEW_LOGS]: "OFF",
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
    permissions: createPermissions({
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
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
    permissions: createPermissions({
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
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
    await prisma.roleConfig.upsert({
      where: { role: config.role },
      update: {
        level: config.level,
        permissions: config.permissions,
        restrictions: config.restrictions,
        isActive: true,
      },
      create: {
        id: generateUUIDv7(),
        role: config.role,
        level: config.level,
        permissions: config.permissions,
        restrictions: config.restrictions,
        isActive: true,
      },
    });

    console.log(`   ✓ ${config.role} (Level ${config.level}) configuré.`);
  }

  console.log(`⚙️  [RBAC] ${ROLE_CONFIGS.length} configurations de rôles synchronisées.`);
}