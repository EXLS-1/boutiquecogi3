// prisma/seed/role-config.seed.ts
import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import {
  ROLES,
  PERMISSIONS,
  RESTRICTIONS,
  type Role,
  type Permission,
  type Restriction,
  type ToggleState,
} from "@/lib/auth/rbac";

// ───────────────────────────────────────────
// CONFIGURATION PAR DÉFAUT DES 6 RÔLES
// ───────────────────────────────────────────

type RoleConfigPayload = {
  role: Role;
  level: number;
  permissions: Record<<Permission, ToggleState>;
  restrictions: Record<<Restriction, string | ToggleState>;
};

const ROLE_CONFIGS: RoleConfigPayload[] = [
  // LEVEL 1 — SUPER_ADMIN : TOUT ON, aucune restriction
  {
    role: ROLES.SUPER_ADMIN,
    level: 1,
    permissions: Object.fromEntries(
      Object.values(PERMISSIONS).map((p) => [p, "ON" as ToggleState])
    ) as Record<<Permission, ToggleState>,
    restrictions: Object.fromEntries(
      Object.values(RESTRICTIONS).map((r) => [r, "OFF" as ToggleState])
    ) as Record<<Restriction, string | ToggleState>,
  },

  // LEVEL 2 — ADMIN : TOUT sauf maintenance système
  {
    role: ROLES.ADMIN,
    level: 2,
    permissions: {
      ...Object.fromEntries(
        Object.values(PERMISSIONS).map((p) => [p, "ON" as ToggleState])
      ) as Record<<Permission, ToggleState>,
      [PERMISSIONS.SYSTEM_MAINTENANCE]: "OFF",
      [PERMISSIONS.SYSTEM_BACKUP]: "OFF",
      [PERMISSIONS.USERS_IMPERSONATE]: "OFF",
    },
    restrictions: {
      ...Object.fromEntries(
        Object.values(RESTRICTIONS).map((r) => [r, "OFF" as ToggleState])
      ) as Record<<Restriction, string | ToggleState>,
      [RESTRICTIONS.REQUIRE_APPROVAL_FOR_DELETE]: "ON",
    },
  },

  // LEVEL 3 — MANAGER
  {
    role: ROLES.MANAGER,
    level: 3,
    permissions: {
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
      // Tout le reste OFF implicitement
      ...Object.fromEntries(
        Object.values(PERMISSIONS)
          .filter(
            (p) => ![
              PERMISSIONS.USERS_READ, PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_BAN,
              PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_UPDATE,
              PERMISSIONS.PRODUCTS_BULK_EDIT, PERMISSIONS.PRODUCTS_IMPORT,
              PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_UPDATE, PERMISSIONS.ORDERS_REFUND, PERMISSIONS.ORDERS_CANCEL,
              PERMISSIONS.CATEGORIES_READ, PERMISSIONS.CATEGORIES_CREATE, PERMISSIONS.CATEGORIES_UPDATE,
              PERMISSIONS.ANALYTICS_READ, PERMISSIONS.ANALYTICS_EXPORT, PERMISSIONS.REPORTS_GENERATE,
              PERMISSIONS.SETTINGS_READ,
              PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_DELETE, PERMISSIONS.MEDIA_READ,
              PERMISSIONS.SYSTEM_LOGS,
              PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_CREATE, PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.CONTENT_PUBLISH, PERMISSIONS.CONTENT_MODERATE,
            ].includes(p)
          )
          .map((p) => [p, "OFF" as ToggleState])
      ),
    },
    restrictions: {
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
      // Tout le reste OFF
      ...Object.fromEntries(
        Object.values(RESTRICTIONS)
          .filter(
            (r) => ![
              RESTRICTIONS.MAX_DAILY_ORDERS, RESTRICTIONS.MAX_PRODUCTS_PER_USER,
              RESTRICTIONS.MAX_STORAGE_MB, RESTRICTIONS.MAX_TEAM_MEMBERS,
              RESTRICTIONS.CAN_ACCESS_API, RESTRICTIONS.CAN_ACCESS_WEBHOOKS,
              RESTRICTIONS.CAN_ACCESS_ADVANCED_ANALYTICS, RESTRICTIONS.CAN_EXPORT_DATA,
              RESTRICTIONS.CAN_USE_BULK_ACTIONS, RESTRICTIONS.RATE_LIMIT_PER_MINUTE,
              RESTRICTIONS.SESSION_DURATION_HOURS,
            ].includes(r)
          )
          .map((r) => [r, "OFF" as ToggleState])
      ),
    },
  },

  // LEVEL 4 — EDITOR
  {
    role: ROLES.EDITOR,
    level: 4,
    permissions: {
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
      ...Object.fromEntries(
        Object.values(PERMISSIONS)
          .filter(
            (p) => ![
              PERMISSIONS.PRODUCTS_READ, PERMISSIONS.PRODUCTS_UPDATE,
              PERMISSIONS.CATEGORIES_READ, PERMISSIONS.ANALYTICS_READ,
              PERMISSIONS.MEDIA_UPLOAD, PERMISSIONS.MEDIA_READ,
              PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_CREATE,
              PERMISSIONS.CONTENT_UPDATE, PERMISSIONS.CONTENT_PUBLISH,
            ].includes(p)
          )
          .map((p) => [p, "OFF" as ToggleState])
      ),
    },
    restrictions: {
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "20",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "100",
      [RESTRICTIONS.MAX_STORAGE_MB]: "512",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "5",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "60",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
      ...Object.fromEntries(
        Object.values(RESTRICTIONS)
          .filter(
            (r) => ![
              RESTRICTIONS.MAX_DAILY_ORDERS, RESTRICTIONS.MAX_PRODUCTS_PER_USER,
              RESTRICTIONS.MAX_STORAGE_MB, RESTRICTIONS.MAX_TEAM_MEMBERS,
              RESTRICTIONS.CAN_ACCESS_API, RESTRICTIONS.RESTRICTED_TO_OWN_DATA,
              RESTRICTIONS.RATE_LIMIT_PER_MINUTE, RESTRICTIONS.SESSION_DURATION_HOURS,
            ].includes(r)
          )
          .map((r) => [r, "OFF" as ToggleState])
      ),
    },
  },

  // LEVEL 5 — SUPERVISOR
  {
    role: ROLES.SUPERVISOR,
    level: 5,
    permissions: {
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_UPDATE]: "ON",
      [PERMISSIONS.ORDERS_CANCEL]: "ON",
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ANALYTICS_READ]: "ON",
      [PERMISSIONS.REPORTS_GENERATE]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.CONTENT_MODERATE]: "ON",
      ...Object.fromEntries(
        Object.values(PERMISSIONS)
          .filter(
            (p) => ![
              PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_UPDATE, PERMISSIONS.ORDERS_CANCEL,
              PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ANALYTICS_READ,
              PERMISSIONS.REPORTS_GENERATE, PERMISSIONS.MEDIA_READ,
              PERMISSIONS.CONTENT_READ, PERMISSIONS.CONTENT_MODERATE,
            ].includes(p)
          )
          .map((p) => [p, "OFF" as ToggleState])
      ),
    },
    restrictions: {
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "50",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "50",
      [RESTRICTIONS.MAX_STORAGE_MB]: "256",
      [RESTRICTIONS.CAN_ACCESS_API]: "ON",
      [RESTRICTIONS.CAN_EXPORT_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RESTRICTED_TO_DEPARTMENT]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "45",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "8",
      ...Object.fromEntries(
        Object.values(RESTRICTIONS)
          .filter(
            (r) => ![
              RESTRICTIONS.MAX_DAILY_ORDERS, RESTRICTIONS.MAX_PRODUCTS_PER_USER,
              RESTRICTIONS.MAX_STORAGE_MB, RESTRICTIONS.CAN_ACCESS_API,
              RESTRICTIONS.CAN_EXPORT_DATA, RESTRICTIONS.RESTRICTED_TO_OWN_DATA,
              RESTRICTIONS.RESTRICTED_TO_DEPARTMENT, RESTRICTIONS.RATE_LIMIT_PER_MINUTE,
              RESTRICTIONS.SESSION_DURATION_HOURS,
            ].includes(r)
          )
          .map((r) => [r, "OFF" as ToggleState])
      ),
    },
  },

  // LEVEL 6 — USER
  {
    role: ROLES.USER,
    level: 6,
    permissions: {
      [PERMISSIONS.PRODUCTS_READ]: "ON",
      [PERMISSIONS.ORDERS_READ]: "ON",
      [PERMISSIONS.ORDERS_CREATE]: "ON",
      [PERMISSIONS.CATEGORIES_READ]: "ON",
      [PERMISSIONS.MEDIA_READ]: "ON",
      [PERMISSIONS.CONTENT_READ]: "ON",
      [PERMISSIONS.SETTINGS_READ]: "ON",
      ...Object.fromEntries(
        Object.values(PERMISSIONS)
          .filter(
            (p) => ![
              PERMISSIONS.PRODUCTS_READ, PERMISSIONS.ORDERS_READ, PERMISSIONS.ORDERS_CREATE,
              PERMISSIONS.CATEGORIES_READ, PERMISSIONS.MEDIA_READ,
              PERMISSIONS.CONTENT_READ, PERMISSIONS.SETTINGS_READ,
            ].includes(p)
          )
          .map((p) => [p, "OFF" as ToggleState])
      ),
    },
    restrictions: {
      [RESTRICTIONS.MAX_DAILY_ORDERS]: "5",
      [RESTRICTIONS.MAX_PRODUCTS_PER_USER]: "0",
      [RESTRICTIONS.MAX_STORAGE_MB]: "50",
      [RESTRICTIONS.MAX_TEAM_MEMBERS]: "1",
      [RESTRICTIONS.RESTRICTED_TO_OWN_DATA]: "ON",
      [RESTRICTIONS.RATE_LIMIT_PER_MINUTE]: "20",
      [RESTRICTIONS.SESSION_DURATION_HOURS]: "4",
      ...Object.fromEntries(
        Object.values(RESTRICTIONS)
          .filter(
            (r) => ![
              RESTRICTIONS.MAX_DAILY_ORDERS, RESTRICTIONS.MAX_PRODUCTS_PER_USER,
              RESTRICTIONS.MAX_STORAGE_MB, RESTRICTIONS.MAX_TEAM_MEMBERS,
              RESTRICTIONS.RESTRICTED_TO_OWN_DATA, RESTRICTIONS.RATE_LIMIT_PER_MINUTE,
              RESTRICTIONS.SESSION_DURATION_HOURS,
            ].includes(r)
          )
          .map((r) => [r, "OFF" as ToggleState])
      ),
    },
  },
];

/**
 * Seed des configurations RBAC en DB.
 * Cette table permet les overrides runtime sans redéploiement.
 */
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