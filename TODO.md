Parfait ! Voici le mapping clair et précis que je te propose pour chaque groupe de la sidebar, basé sur les permissions définies dans LE fichier rbac.ts.

📋 MAPPING COMPLET - SIDEBAR GROUPS → PERMISSIONS
🏠 Administration / Super-Admin (Sensibles)
Groupe Sidebar	Permission RBAC (exacte)
Audit / Logs	SYSTEM_LOGS
Rôles & Permissions	SETTINGS_ROLES_MANAGE
Maintenance	SYSTEM_MAINTENANCE
Sauvegardes	SYSTEM_BACKUP
📦 Catalogue / Produits
Groupe Sidebar	Permission RBAC (exacte)
Liste produits	PRODUCTS_READ
Ajouter produit	PRODUCTS_CREATE
Modifier produit	PRODUCTS_UPDATE
Supprimer produit	PRODUCTS_DELETE
Gérer variantes	PRODUCTS_UPDATE (ou PRODUCTS_BULK_EDIT si modification en masse)
Réorganiser catégories	CATEGORIES_UPDATE
Avis clients	CONTENT_MODERATE (ou PRODUCTS_UPDATE si tu préfères confier ça aux éditeurs de produit)
Promotions / Coupons	CONTENT_CREATE + CONTENT_UPDATE (car ce sont des contenus marketing promotionnels)
Import/Export produit	PRODUCTS_IMPORT + PRODUCTS_EXPORT
🛒 Ventes / Commandes
Groupe Sidebar	Permission RBAC (exacte)
Liste commandes	ORDERS_READ
Créer commande	ORDERS_CREATE
Modifier commande	ORDERS_UPDATE
Annuler commande	ORDERS_CANCEL
Rembourser	ORDERS_REFUND
Trésorerie / Paiements / Checkout	ORDERS_UPDATE (ou ORDERS_READ si juste suivi)
📊 Analyse & Rapports
Groupe Sidebar	Permission RBAC (exacte)
Tableaux de bord	ANALYTICS_READ
Exporter données	ANALYTICS_EXPORT
Générer rapports	REPORTS_GENERATE
Planifier rapports	REPORTS_SCHEDULE
⚙️ Configuration / Paramètres
Groupe Sidebar	Permission RBAC (exacte)
Paramètres généraux	SETTINGS_READ
Modifier paramètres	SETTINGS_UPDATE
Facturation / Billing	SETTINGS_BILLING
Rôles & Permissions (déjà listé plus haut)	SETTINGS_ROLES_MANAGE
📁 Médias
Groupe Sidebar	Permission RBAC (exacte)
Bibliothèque médias	MEDIA_READ
Upload média	MEDIA_UPLOAD
Supprimer média	MEDIA_DELETE
📝 Contenu (articles, pages, blog)
Groupe Sidebar	Permission RBAC (exacte)
Lire contenu	CONTENT_READ
Créer contenu	CONTENT_CREATE
Modifier contenu	CONTENT_UPDATE
Supprimer contenu	CONTENT_DELETE
Publier / Dépublier	CONTENT_PUBLISH
Modérer commentaires / avis	CONTENT_MODERATE
🧠 RÉSUMÉ SIMPLIFIÉ (pour ta config NAVIGATION_ITEMS)
Voici une liste clé-valeur pour que tu puisses directement intégrer dans ta sidebar :

const GROUP_PERMISSION_MAP = {
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
  "Gérer variantes": "PRODUCTS_UPDATE", // ou PRODUCTS_BULK_EDIT pour batch
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
  "Trésorerie / Paiements / Checkout": "ORDERS_UPDATE",

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
};
🚀 PROCHAINE ÉTAPE

Mettre à jour NAVIGATION_ITEMS en utilisant ce mapping.

Supprimer le filterNavigation dupliqué partout et utiliser un wrapper DRY côté serveur (ex: withPermission).

Créer un fichier centralisé lib/navigation/permissions.ts pour centraliser ce mapping et le partager entre sidebar, proxy, et pages.