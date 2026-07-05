import type { Permission } from "@/lib/auth/rbac";

export const GROUP_PERMISSION_MAP = {
  // Admin sensible
  "Audit / Logs": "SYSTEM_LOGS",
  "Rôles & Permissions": "SETTINGS_ROLES_MANAGE",
  "Maintenance": "SYSTEM_MAINTENANCE",
  "Sauvegardes": "SYSTEM_BACKUP",

  // Produits
  "Liste produits": "PRODUCTS_READ",
  "Ajouter produit": "PRODUCTS_CREATE",
  "Modifier produit": "PRODUCTS_UPDATE",
  "Supprimer produit": "PRODUCTS_DELETE",
  "Gérer variantes": "PRODUCTS_UPDATE", // ou PRODUCTS_BULK_EDIT
  "Réorganiser catégories": "CATEGORIES_UPDATE",
  "Avis clients": "CONTENT_MODERATE", // ou PRODUCTS_UPDATE
  "Promotions / Coupons": "CONTENT_CREATE", // ou CONTENT_UPDATE
  "Import/Export produit": "PRODUCTS_IMPORT",

  // Commandes
  "Liste commandes": "ORDERS_READ",
  "Créer commande": "ORDERS_CREATE",
  "Modifier commande": "ORDERS_UPDATE",
  "Annuler commande": "ORDERS_CANCEL",
  "Rembourser": "ORDERS_REFUND",
  "Trésorerie / Paiements / Checkout": "ORDERS_UPDATE", // (ou ORDERS_READ si simple suivi)

  // Analyse
  "Tableaux de bord": "ANALYTICS_READ",
  "Exporter données": "ANALYTICS_EXPORT",
  "Générer rapports": "REPORTS_GENERATE",
  "Planifier rapports": "REPORTS_SCHEDULE",

  // Paramètres
  "Paramètres généraux": "SETTINGS_READ",
  "Modifier paramètres": "SETTINGS_UPDATE",
  "Facturation / Billing": "SETTINGS_BILLING",

  // Médias
  "Bibliothèque médias": "MEDIA_READ",
  "Upload média": "MEDIA_UPLOAD",
  "Supprimer média": "MEDIA_DELETE",

  // Contenu
  "Lire contenu": "CONTENT_READ",
  "Créer contenu": "CONTENT_CREATE",
  "Modifier contenu": "CONTENT_UPDATE",
  "Supprimer contenu": "CONTENT_DELETE",
  "Publier / Dépublier": "CONTENT_PUBLISH",
  "Modérer commentaires / avis": "CONTENT_MODERATE",
} as const;

type PermissionToken = (typeof GROUP_PERMISSION_MAP)[keyof typeof GROUP_PERMISSION_MAP];

const TOKEN_TO_PERMISSION: Record<PermissionToken, Permission> = {
  // Admin sensibles
  SYSTEM_LOGS: "system:logs",
  SETTINGS_ROLES_MANAGE: "settings:roles-manage",
  SYSTEM_MAINTENANCE: "system:maintenance",
  SYSTEM_BACKUP: "system:backup",

  // Produits
  PRODUCTS_READ: "products:read",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_IMPORT: "products:import",

  // Catégories
  CATEGORIES_UPDATE: "categories:update",

  // Contenu
  CONTENT_MODERATE: "content:moderate",
  CONTENT_CREATE: "content:create",

  // Commandes
  ORDERS_READ: "orders:read",
  ORDERS_CREATE: "orders:create",
  ORDERS_UPDATE: "orders:update",
  ORDERS_CANCEL: "orders:cancel",
  ORDERS_REFUND: "orders:refund",

  // Analyse
  ANALYTICS_READ: "analytics:read",
  ANALYTICS_EXPORT: "analytics:export",
  REPORTS_GENERATE: "reports:generate",
  REPORTS_SCHEDULE: "reports:schedule",

  // Paramètres
  SETTINGS_READ: "settings:read",
  SETTINGS_UPDATE: "settings:update",
  SETTINGS_BILLING: "settings:billing",

  // Médias
  MEDIA_READ: "media:read",
  MEDIA_UPLOAD: "media:upload",
  MEDIA_DELETE: "media:delete",

  // Contenu
  CONTENT_READ: "content:read",
  CONTENT_UPDATE: "content:update",
  CONTENT_DELETE: "content:delete",
  CONTENT_PUBLISH: "content:publish",
};

export function getPermissionTokenForSidebarGroup(
  groupLabel: string,
): PermissionToken | undefined {
  return (GROUP_PERMISSION_MAP as Record<string, PermissionToken>)[groupLabel];
}

export function getPermissionForSidebarGroup(
  groupLabel: string,
): Permission | undefined {
  const token = getPermissionTokenForSidebarGroup(groupLabel);
  if (!token) return undefined;
  return TOKEN_TO_PERMISSION[token];
}

