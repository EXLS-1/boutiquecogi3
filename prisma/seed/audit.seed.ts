import { PrismaClient } from "@prisma/client";
import { generateUUIDv7 } from "@/lib/uuid";
import { ROLES, PERMISSIONS } from "@/lib/auth/rbac";

interface AuditEventType {
  event: string;
  label: string;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  whoCanView: string[];
  whoCanDelete: string[];
  requiredPermissionView: string;
  requiredPermissionDelete: string;
  minRoleLevelView: number;
  minRoleLevelDelete: number;
  retentionDays: number;
  isImmutable: boolean;
}

const AUDIT_EVENT_TYPES: AuditEventType[] = [
  {
    event: "USER_LOGIN", label: "Connexion utilisateur",
    description: "Un utilisateur s'est connecté au système",
    severity: "INFO", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SYSTEM_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 5, minRoleLevelDelete: 1, retentionDays: 90, isImmutable: true,
  },
  {
    event: "USER_ROLE_CHANGE", label: "Changement de rôle",
    description: "Le rôle d'un utilisateur a été modifié",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SYSTEM_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 2, minRoleLevelDelete: 1, retentionDays: 365, isImmutable: true,
  },
  {
    event: "PRODUCT_CREATE", label: "Création de produit",
    description: "Un nouveau produit a été créé",
    severity: "INFO", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.EDITOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionView: PERMISSIONS.PRODUCTS_READ,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 4, minRoleLevelDelete: 2, retentionDays: 180, isImmutable: true,
  },
  {
    event: "PRODUCT_DELETE", label: "Suppression de produit",
    description: "Un produit a été supprimé",
    severity: "WARNING", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.PRODUCTS_READ,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 3, minRoleLevelDelete: 1, retentionDays: 365, isImmutable: true,
  },
  {
    event: "ORDER_STATUS_CHANGE", label: "Changement de statut de commande",
    description: "Le statut d'une commande a été modifié",
    severity: "INFO", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER, ROLES.SUPERVISOR],
    whoCanDelete: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    requiredPermissionView: PERMISSIONS.ORDERS_READ,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 5, minRoleLevelDelete: 2, retentionDays: 180, isImmutable: true,
  },
  {
    event: "ORDER_REFUND", label: "Remboursement",
    description: "Un remboursement a été effectué",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.ORDERS_READ,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 3, minRoleLevelDelete: 1, retentionDays: 730, isImmutable: true,
  },
  {
    event: "PERMISSION_OVERRIDE", label: "Override de permission",
    description: "Une permission a été modifiée manuellement",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SETTINGS_ROLES_MANAGE,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 1, minRoleLevelDelete: 1, retentionDays: 730, isImmutable: true,
  },
  {
    event: "BULK_ACTION", label: "Action en masse",
    description: "Une action en masse a été exécutée",
    severity: "WARNING", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SYSTEM_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 3, minRoleLevelDelete: 1, retentionDays: 365, isImmutable: true,
  },
  {
    event: "SECURITY_ALERT", label: "Alerte de sécurité",
    description: "Une activité suspecte a été détectée",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SYSTEM_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 2, minRoleLevelDelete: 1, retentionDays: 730, isImmutable: true,
  },
  {
    event: "API_ACCESS", label: "Accès API",
    description: "Un appel API a été effectué",
    severity: "INFO", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.SYSTEM_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 2, minRoleLevelDelete: 1, retentionDays: 30, isImmutable: true,
  },
  {
    event: "AUDIT_APPROVAL_REQUESTED", label: "Demande d'approbation d'audit",
    description: "Un utilisateur a demandé l'approbation pour basculer vers un rôle inférieur",
    severity: "WARNING", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.AUDIT_VIEW_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 2, minRoleLevelDelete: 1, retentionDays: 365, isImmutable: true,
  },
  {
    event: "AUDIT_APPROVAL_GRANTED", label: "Approbation d'audit accordée",
    description: "Un SUPER_ADMIN a approuvé une demande d'audit",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.AUDIT_APPROVE_REQUEST,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 1, minRoleLevelDelete: 1, retentionDays: 730, isImmutable: true,
  },
  {
    event: "AUDIT_APPROVAL_REJECTED", label: "Approbation d'audit rejetée",
    description: "Une demande d'approbation d'audit a été rejetée",
    severity: "WARNING", whoCanView: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.AUDIT_VIEW_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 2, minRoleLevelDelete: 1, retentionDays: 365, isImmutable: true,
  },
  {
    event: "AUDIT_SWITCH_EXECUTED", label: "Basculement d'audit exécuté",
    description: "Un utilisateur a basculé vers un rôle inférieur avec approbation",
    severity: "CRITICAL", whoCanView: [ROLES.SUPER_ADMIN],
    whoCanDelete: [ROLES.SUPER_ADMIN],
    requiredPermissionView: PERMISSIONS.AUDIT_VIEW_LOGS,
    requiredPermissionDelete: PERMISSIONS.SYSTEM_MAINTENANCE,
    minRoleLevelView: 1, minRoleLevelDelete: 1, retentionDays: 730, isImmutable: true,
  },
];

interface RetentionPolicy {
  policyName: string;
  label: string;
  description: string;
  retentionDays: number;
  whoCanConfigure: string[];
  minRoleLevel: number;
  autoArchive: boolean;
  autoDelete: boolean;
}

const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    policyName: "STANDARD_LOGS", label: "Logs standard",
    description: "Logs standard du système", retentionDays: 90,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN], minRoleLevel: 2,
    autoArchive: true, autoDelete: true,
  },
  {
    policyName: "CRITICAL_EVENTS", label: "Événements critiques",
    description: "Événements critiques (sécurité, finance)", retentionDays: 730,
    whoCanConfigure: [ROLES.SUPER_ADMIN], minRoleLevel: 1,
    autoArchive: true, autoDelete: false,
  },
  {
    policyName: "USER_ACTIVITY", label: "Activité utilisateurs",
    description: "Activité des utilisateurs", retentionDays: 180,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN], minRoleLevel: 2,
    autoArchive: true, autoDelete: true,
  },
  {
    policyName: "ORDER_HISTORY", label: "Historique commandes",
    description: "Historique des commandes", retentionDays: 365,
    whoCanConfigure: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], minRoleLevel: 3,
    autoArchive: true, autoDelete: false,
  },
  {
    policyName: "AUDIT_APPROVAL_LOGS", label: "Logs d'approbation d'audit",
    description: "Traçabilité des demandes et approbations d'audit de rôle", retentionDays: 730,
    whoCanConfigure: [ROLES.SUPER_ADMIN], minRoleLevel: 1,
    autoArchive: true, autoDelete: false,
  },
];

export async function seedAuditEventTypes(prisma: PrismaClient) {
  console.log("📋 [RBAC] Configuration des types d'événements d'audit...");
  for (const event of AUDIT_EVENT_TYPES) {
    await prisma.auditEventType.upsert({
      where: { event: event.event },
      update: {
        label: event.label, description: event.description, severity: event.severity,
        whoCanView: event.whoCanView, whoCanDelete: event.whoCanDelete,
        requiredPermissionView: event.requiredPermissionView,
        requiredPermissionDelete: event.requiredPermissionDelete,
        minRoleLevelView: event.minRoleLevelView, minRoleLevelDelete: event.minRoleLevelDelete,
        retentionDays: event.retentionDays, isImmutable: event.isImmutable,
      },
      create: {
        id: generateUUIDv7(), event: event.event, label: event.label,
        description: event.description, severity: event.severity,
        whoCanView: event.whoCanView, whoCanDelete: event.whoCanDelete,
        requiredPermissionView: event.requiredPermissionView,
        requiredPermissionDelete: event.requiredPermissionDelete,
        minRoleLevelView: event.minRoleLevelView, minRoleLevelDelete: event.minRoleLevelDelete,
        retentionDays: event.retentionDays, isImmutable: event.isImmutable,
      },
    });
    console.log(`   ✓ ${event.label} [severity:${event.severity}, view:L${event.minRoleLevelView}, delete:L${event.minRoleLevelDelete}]`);
  }
  console.log(`📋 [RBAC] ${AUDIT_EVENT_TYPES.length} types d'événements d'audit configurés.`);
}

export async function seedRetentionPolicies(prisma: PrismaClient) {
  console.log("🗄️  [RBAC] Configuration des politiques de rétention...");
  for (const policy of RETENTION_POLICIES) {
    await prisma.retentionPolicy.upsert({
      where: { policyName: policy.policyName },
      update: {
        label: policy.label, description: policy.description, retentionDays: policy.retentionDays,
        whoCanConfigure: policy.whoCanConfigure, minRoleLevel: policy.minRoleLevel,
        autoArchive: policy.autoArchive, autoDelete: policy.autoDelete,
      },
      create: {
        id: generateUUIDv7(), policyName: policy.policyName, label: policy.label,
        description: policy.description, retentionDays: policy.retentionDays,
        whoCanConfigure: policy.whoCanConfigure, minRoleLevel: policy.minRoleLevel,
        autoArchive: policy.autoArchive, autoDelete: policy.autoDelete,
      },
    });
    console.log(`   ✓ ${policy.policyName} [${policy.retentionDays}j, archive:${policy.autoArchive}, delete:${policy.autoDelete}]`);
  }
  console.log(`🗄️  [RBAC] ${RETENTION_POLICIES.length} politiques de rétention configurées.`);
}
