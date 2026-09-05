// lib/constants/super_admin-shortcuts.ts
/**
 * Configuration statique des raccourcis du portail super_admin.
 *
 * - Séparée du composant pour respecter DRY et la testabilité.
 * - Chaque groupe possède des modules spécifiques à son domaine.
 * - Aucune donnée dynamique : uniquement des constantes.
 */

import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  Database,
  FileClock,
  FileText,
  Gauge,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  Megaphone,
  PackageCheck,
  PackagePlus,
  Receipt,
  RotateCcw,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Tags,
  TrendingUp,
  Truck,
  UserCheck,
  UserCog,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type AdminModule = {
  /** Titre affiché sur la carte */
  title: string;
  /** Description courte (< 120 caractères recommandés) */
  description: string;
  /** Route interne Next.js */
  href: string;
  /** Libellé du bouton d'action */
  cta: string;
  /** Icône Lucide */
  icon: LucideIcon;
  /** Classe Tailwind pour la couleur de l'icône */
  tone: string;
};

export type AdminShortcutGroup = {
  /** Identifiant unique (sans espaces) */
  id: string;
  /** Libellé affiché dans la sidebar */
  label: string;
  /** Sur-titre (eyebrow) du groupe actif */
  eyebrow: string;
  /** Titre principal du groupe actif */
  title: string;
  /** Description du groupe actif */
  description: string;
  /** Liste des modules du groupe */
  modules: AdminModule[];
};

/* ------------------------------------------------------------------ */
/*  Données                                                            */
/* ------------------------------------------------------------------ */

export const ADMIN_SHORTCUT_GROUPS: AdminShortcutGroup[] = [
  
  /* ─────────────────── 01 · DASHBOARD ─────────────────── */
  {
    id: "dashboard",
    label: "01. Dashboard",
    eyebrow: "Vue globale",
    title: "Modules de pilotage",
    description:
      "Accès rapide aux indicateurs (KPI) principaux, journaux et actions prioritaires.",
    modules: [
      {
        title: "Activités récentes",
        description: "Consulter le journal des actions récentes sur la plateforme.",
        href: "/dashboard",
        cta: "Afficher",
        icon: ClipboardList,
        tone: "text-cyan-200",
      },
      {
        title: "Alertes opérationnelles",
        description: "Surveiller les seuils critiques et notifications système.",
        href: "/dashboard/alerts",
        cta: "Afficher",
        icon: Activity,
        tone: "text-rose-500",
      },
      {
        title: "Clients",
        description: "Suivre les indicateurs clés liés à la base clients.",
        href: "/admin/users",
        cta: "Afficher",
        icon: Users,
        tone: "text-cyan-500",
      },
      {
        title: "Produits",
        description: "Vue synthétique du catalogue et des statuts produits.",
        href: "/admin/product",
        cta: "Afficher",
        icon: Boxes,
        tone: "text-violet-500",
      },
      {
        title: "Commandes",
        description: "Analyser les volumes, tendances et statuts de commandes.",
        href: "/admin/order",
        cta: "Afficher",
        icon: ShoppingBag,
        tone: "text-blue-500",
      },
      {
        title: "Paniers actifs",
        description: "Suivre les paniers en cours et les taux d'abandon.",
        href: "/dashboard/carts",
        cta: "Afficher",
        icon: PackagePlus,
        tone: "text-amber-500",
      },
      {
        title: "Ventes",
        description: "Indicateurs de chiffre d'affaires et performances.",
        href: "/dashboard/analytics",
        cta: "Afficher",
        icon: BarChart3,
        tone: "text-cyan-200",
      },
      {
        title: "Paiements",
        description: "Synthèse des transactions et rapprochements.",
        href: "/dashboard/treasury",
        cta: "Afficher",
        icon: CreditCard,
        tone: "text-blue-500",
      },
      {
        title: "Chiffre d'affaires",
        description: "Tableau de bord financier et prévisions.",
        href: "/dashboard/revenue",
        cta: "Afficher",
        icon: TrendingUp,
        tone: "text-cyan-200",
      },
      {
        title: "Stock",
        description: "Vue globale des niveaux de stock par entrepôt.",
        href: "/admin/stock",
        cta: "Afficher",
        icon: Warehouse,
        tone: "text-cyan-500",
      },
      {
        title: "Graphiques",
        description: "Visualisations et rapports graphiques interactifs.",
        href: "/dashboard/analytics",
        cta: "Afficher",
        icon: BarChart3,
        tone: "text-indigo-500",
      },
    ],
  },

  /* ─────────────────── 02 · PRODUITS ─────────────────── */
  {
    id: "products",
    label: "02. Produit",
    eyebrow: "Catalogue",
    title: "Modules produits",
    description:
      "Créer, importer, publier et organiser les produits du catalogue.",
    modules: [
      {
        title: "Logiques produits",
        description: "Administrer les fiches produits, images, prix et statuts.",
        href: "/admin/product",
        cta: "Gérer",
        icon: Boxes,
        tone: "text-cyan-500",
      },
      {
        title: "CRUD Produits",
        description: "Traitement complet des produits et de leurs variants.",
        href: "/admin/product/drafts",
        cta: "Voir les brouillons",
        icon: PackagePlus,
        tone: "text-amber-500",
      },
      {
        title: "Catégories",
        description: "Classer les produits et maintenir les familles du catalogue.",
        href: "/dashboard/categories",
        cta: "Organiser",
        icon: Tags,
        tone: "text-cyan-200",
      },
      {
        title: "Variantes",
        description: "Gérer les déclinaisons (taille, couleur, matière).",
        href: "/admin/product/variants",
        cta: "Gérer",
        icon: SlidersHorizontal,
        tone: "text-violet-500",
      },
      {
        title: "Médias",
        description: "Contrôler les images, vidéos et ressources rattachées.",
        href: "/dashboard/media",
        cta: "Médias",
        icon: PackageCheck,
        tone: "text-blue-500",
      },
      {
        title: "Import CSV",
        description: "Charger rapidement des données produits en volume.",
        href: "/admin/product/import",
        cta: "Importer",
        icon: FileClock,
        tone: "text-rose-500",
      },
    ],
  },

  /* ─────────────────── 03 · INVENTAIRE ─────────────────── */
  {
    id: "inventory",
    label: "03. Inventaire",
    eyebrow: "Inventaire",
    title: "Modules stock",
    description:
      "Suivre les disponibilités, mouvements et besoins d'approvisionnement.",
    modules: [
      {
        title: "État du stock",
        description: "Consulter les quantités disponibles par produit et variante.",
        href: "/admin/stock",
        cta: "Voir le stock",
        icon: Warehouse,
        tone: "text-cyan-200",
      },
      {
        title: "Mouvements",
        description: "Tracer les entrées, sorties, corrections et ajustements.",
        href: "/admin/stock/movements",
        cta: "Analyser",
        icon: Activity,
        tone: "text-amber-500",
      },
      {
        title: "Stock critique",
        description: "Repérer les alertes de rupture ou seuils critiques.",
        href: "/admin/stock/alerts",
        cta: "Vérifier",
        icon: PackageCheck,
        tone: "text-rose-500",
      },
      {
        title: "Ledger",
        description: "Croiser l'inventaire avec les commandes en cours.",
        href: "/admin/order",
        cta: "Voir commandes",
        icon: Truck,
        tone: "text-blue-500",
      },
    ],
  },

  /* ─────────────────── 04 · COMMANDES ─────────────────── */
  {
    id: "orders",
    label: "04. Commandes",
    eyebrow: "Opérations",
    title: "Modules commandes",
    description:
      "Piloter les commandes, paiements, livraisons et contrôles associés.",
    modules: [
      {
        title: "Liste commandes",
        description: "Suivre les commandes, statuts et détails client.",
        href: "/admin/order",
        cta: "Ouvrir",
        icon: ClipboardList,
        tone: "text-blue-500",
      },
      {
        title: "Paiements",
        description: "Vérifier les transactions et rapprochements de paiement.",
        href: "/dashboard/checkout",
        cta: "Contrôler",
        icon: CreditCard,
        tone: "text-cyan-200",
      },
      {
        title: "Expédition",
        description: "Accéder aux données utiles au traitement logistique.",
        href: "/admin/order/shipping",
        cta: "Traiter",
        icon: Truck,
        tone: "text-cyan-500",
      },
      {
        title: "Audit commandes",
        description: "Consulter les traces de modifications sur les commandes.",
        href: "/dashboard/audit",
        cta: "Auditer",
        icon: FileClock,
        tone: "text-amber-500",
      },
    ],
  },

  /* ─────────────────── 05 · PAIEMENTS ─────────────────── */
  {
    id: "payments",
    label: "05. Paiement",
    eyebrow: "Finance",
    title: "Modules paiement",
    description:
      "Surveiller les paiements, validations et réglages financiers.",
    modules: [
      {
        title: "Checkout",
        description: "Consulter les flux de paiement et commandes associées.",
        href: "/dashboard/checkout",
        cta: "Ouvrir",
        icon: CreditCard,
        tone: "text-cyan-200",
      },
      {
        title: "Transactions",
        description: "Vérifier les références, montants et statuts de paiement.",
        href: "/dashboard/treasury",
        cta: "Voir trésorerie",
        icon: Receipt,
        tone: "text-blue-500",
      },
      {
        title: "Paramètres paiement",
        description: "Ajuster les options de paiement et intégrations actives.",
        href: "/dashboard/settings/payments",
        cta: "Configurer",
        icon: SlidersHorizontal,
        tone: "text-slate-500",
      },
    ],
  },

  /* ─────────────────── 06 · UTILISATEURS ─────────────────── */
  {
    id: "users",
    label: "06. Utilisateurs",
    eyebrow: "Personnel",
    title: "Administration utilisateurs",
    description:
      "Raccourcis pour les profils, blocages, permissions et activité.",
    modules: [
      {
        title: "Gestion des Utilisateurs",
        description: "Rechercher, filtrer et administrer les utilisateurs existants.",
        href: "/admin/users",
        cta: "Afficher",
        icon: Users,
        tone: "text-blue-500",
      },
      {
        title: "Gestion des Comptes",
        description: "Rechercher, filtrer et administrer les Comptes des utilisateurs existants.",
        href: "/admin/account",
        cta: "Afficher",
        icon: Users,
        tone: "text-blue-500",
      },
      {
        title: "Rôles",
        description: "Ajuster les rattachements RBAC et niveaux d'accès.",
        href: "/admin/role",
        cta: "Modifier",
        icon: UserCog,
        tone: "text-violet-500",
      },
      {
        title: "Déblocage",
        description: "Identifier les comptes bloqués et rétablir un accès valide.",
        href: "/admin/users/blocked",
        cta: "Afficher",
        icon: UserCheck,
        tone: "text-cyan-200",
      },
      {
        title: "Audit utilisateur",
        description: "Examiner les événements liés aux comptes et sessions.",
        href: "/dashboard/audit",
        cta: "Afficher",
        icon: FileClock,
        tone: "text-amber-500",
      },
      {
        title: "Paramètres utilisateur",
        description: "Accéder aux réglages applicatifs liés à la gestion des comptes.",
        href: "/dashboard/settings/users",
        cta: "Afficher",
        icon: Settings,
        tone: "text-slate-500",
      },
    ],
  },

  /* ─────────────────── 07 · RÔLES ─────────────────── */
  {
    id: "roles",
    label: "07. Roles",
    eyebrow: "RBAC",
    title: "Gestion des Roles",
    description:
      "Configurer les niveaux, permissions et protections des roles sensibles.",
    modules: [
      {
        title: "Role - Configuration",
        description: "",
        href: "/admin/roles",
        cta: "Afficher",
        icon: Shield,
        tone: "text-cyan-200",
      },
       {
        title: "Role - Permissions",
        description: "",
        href: "/admin/role_permissions",
        cta: "Afficher",
        icon: UserCog,
        tone: "text-violet-500",
      },
      {
        title: "Role - Restrictions",
        description: "",
        href: "/admin/role_restrictions",
        cta: "Afficher",
        icon: ShieldCheck,
        tone: "text-cyan-500",
      },
      {
        title: "Roles - attributs & audit ",
        description: "Contrôler les changements de droits et les opérations critiques.",
        href: "/admin/role_audit",
        cta: "Afficher",
        icon: FileClock,
        tone: "text-amber-500",
      },
    ],
  },

  /* ─────────────────── 08 · SÉCURITÉ 2FA ─────────────────── */
  {
    id: "security",
    label: "08. Sécurité 2FA",
    eyebrow: "Sécurité",
    title: "Sécurité et double authentification",
    description:
      "Options dédiées au 2FA, aux sessions et aux contrôles sensibles.",
    modules: [
      {
        title: "Configuration 2FA",
        description: "Activer, vérifier ou mettre à jour l'authentification à deux facteurs.",
        href: "/admin/setup-2fa",
        cta: "Configurer",
        icon: KeyRound,
        tone: "text-cyan-200",
      },
      {
        title: "Vérification 2FA",
        description: "Valider les sessions administrateur protégées par code.",
        href: "/admin/verify-2fa",
        cta: "Vérifier",
        icon: LockKeyhole,
        tone: "text-rose-500",
      },
      {
        title: "Contexte sécurité",
        description: "Consulter les traces et signaux liés aux accès privilégiés.",
        href: "/dashboard/audit",
        cta: "Consulter",
        icon: Activity,
        tone: "text-amber-500",
      },
    ],
  },

  /* ─────────────────── 09 · PARAMÈTRES ─────────────────── */
  {
    id: "settings",
    label: "09. Paramètres",
    eyebrow: "Configuration",
    title: "Modules de configuration",
    description:
      "Raccourcis vers les réglages système, sécurité, rôles et application.",
    modules: [
      {
        title: "Paramètres généraux",
        description: "Modifier les réglages principaux de l'administration.",
        href: "/dashboard/settings",
        cta: "Ouvrir",
        icon: Settings,
        tone: "text-slate-500",
      },
      {
        title: "Paramètres avancés",
        description: "Accéder aux options avancées réservées aux administrateurs.",
        href: "/admin/settings/advanced",
        cta: "Avancé",
        icon: SlidersHorizontal,
        tone: "text-cyan-500",
      },
      {
        title: "Sécurité",
        description: "Revoir les protections d'accès et contrôles privilégiés.",
        href: "/admin/setup-2fa",
        cta: "Sécuriser",
        icon: LockKeyhole,
        tone: "text-rose-500",
      },
      {
        title: "Rôles et permissions",
        description: "Configurer les rôles disponibles et leurs permissions.",
        href: "/admin/role",
        cta: "Rôles",
        icon: ShieldCheck,
        tone: "text-cyan-200",
      },
    ],
  },

  /* ─────────────────── 10 · MARKETING ─────────────────── */
  {
    id: "marketing",
    label: "10. Marketing",
    eyebrow: "Marketing",
    title: "Modules marketing",
    description:
      "Piloter les campagnes, promotions et codes de réduction.",
    modules: [
      {
        title: "Campagnes",
        description: "Créer et suivre les campagnes promotionnelles en cours.",
        href: "/admin/marketing/campaigns",
        cta: "Gérer",
        icon: Megaphone,
        tone: "text-rose-500",
      },
      {
        title: "Codes promo",
        description: "Générer, activer ou révoquer les codes de réduction.",
        href: "/admin/marketing/coupons",
        cta: "Gérer",
        icon: Tags,
        tone: "text-amber-500",
      },
      {
        title: "Bannières",
        description: "Administrer les visuels promotionnels du site.",
        href: "/admin/marketing/banners",
        cta: "Configurer",
        icon: LayoutDashboard,
        tone: "text-violet-500",
      },
      {
        title: "Email marketing",
        description: "Planifier et analyser les envois d'emails transactionnels.",
        href: "/admin/marketing/emails",
        cta: "Ouvrir",
        icon: Mail,
        tone: "text-blue-500",
      },
    ],
  },

  /* ─────────────────── 11 · RETOURS & REMBOURSEMENTS ─────────────────── */
  {
    id: "returns",
    label: "11. Retours",
    eyebrow: "SAV",
    title: "Retours et remboursements",
    description:
      "Traiter les demandes de retour, remboursements et litiges clients.",
    modules: [
      {
        title: "Liste des retours",
        description: "Consulter et traiter les demandes de retour en attente.",
        href: "/admin/returns",
        cta: "Ouvrir",
        icon: RotateCcw,
        tone: "text-amber-500",
      },
      {
        title: "Remboursements",
        description: "Valider ou rejeter les remboursements en cours.",
        href: "/admin/returns/refunds",
        cta: "Traiter",
        icon: Receipt,
        tone: "text-rose-500",
      },
      {
        title: "Politique retour",
        description: "Configurer les règles, délais et conditions de retour.",
        href: "/admin/returns/policy",
        cta: "Configurer",
        icon: SlidersHorizontal,
        tone: "text-cyan-500",
      },
    ],
  },

  /* ─────────────────── 12 · ANALYTICS ─────────────────── */
  {
    id: "analytics",
    label: "12. Analytics",
    eyebrow: "Analytique",
    title: "Modules analytiques",
    description:
      "Rapports de performance, tendances et indicateurs de conversion.",
    modules: [
      {
        title: "Rapports ventes",
        description: "Analyser les performances commerciales par période.",
        href: "/dashboard/analytics/sales",
        cta: "Consulter",
        icon: BarChart3,
        tone: "text-blue-500",
      },
      {
        title: "Tendances",
        description: "Identifier les produits et catégories en croissance.",
        href: "/dashboard/analytics/trends",
        cta: "Explorer",
        icon: TrendingUp,
        tone: "text-cyan-200",
      },
      {
        title: "Conversion",
        description: "Suivre les taux de conversion et points de friction.",
        href: "/dashboard/analytics/conversion",
        cta: "Analyser",
        icon: Gauge,
        tone: "text-violet-500",
      },
      {
        title: "Panier moyen",
        description: "Mesurer la valeur moyenne des commandes.",
        href: "/dashboard/analytics/aov",
        cta: "Voir",
        icon: ShoppingBag,
        tone: "text-amber-500",
      },
    ],
  },

  /* ─────────────────── 13 · NOTIFICATIONS ─────────────────── */
  {
    id: "notifications",
    label: "13. Notifications",
    eyebrow: "Communication",
    title: "Modules notifications",
    description:
      "Gérer les templates, canaux et historiques de notifications.",
    modules: [
      {
        title: "Templates",
        description: "Éditer les modèles de notifications email et push.",
        href: "/admin/notifications/templates",
        cta: "Éditer",
        icon: Mail,
        tone: "text-blue-500",
      },
      {
        title: "Historique",
        description: "Consulter l'historique des notifications envoyées.",
        href: "/admin/notifications/history",
        cta: "Consulter",
        icon: Bell,
        tone: "text-amber-500",
      },
      {
        title: "Paramètres",
        description: "Configurer les canaux et règles de déclenchement.",
        href: "/admin/notifications/settings",
        cta: "Configurer",
        icon: Settings,
        tone: "text-slate-500",
      },
    ],
  },

  /* ─────────────────── 14 · HEALTH ─────────────────── */
  {
    id: "health",
    label: "14. Santé système",
    eyebrow: "Infrastructure",
    title: "Modules de supervision",
    description:
      "Surveiller l'état des services, bases de données et performances.",
    modules: [
      {
        title: "Système",
        description: "Vérifier l'état général du serveur et des services.",
        href: "/admin/health/system",
        cta: "Vérifier",
        icon: Server,
        tone: "text-cyan-200",
      },
      {
        title: "Base de données",
        description: "Consulter les métriques PostgreSQL et Prisma.",
        href: "/admin/health/database",
        cta: "Consulter",
        icon: Database,
        tone: "text-cyan-500",
      },
      {
        title: "Cache & Stockage",
        description: "Surveiller l'utilisation du cache et du stockage disque.",
        href: "/admin/health/storage",
        cta: "Analyser",
        icon: HardDrive,
        tone: "text-amber-500",
      },
      {
        title: "Journaux",
        description: "Accéder aux logs applicatifs et erreurs système.",
        href: "/admin/health/logs",
        cta: "Ouvrir",
        icon: FileClock,
        tone: "text-rose-500",
      },
    ],
  },

  /* ─────────────────── 15 · POLITIQUES & CONDITIONS ─────────────────── */
  {
    id: "policies",
    label: "15. Politiques & Conditions",
    eyebrow: "Juridique",
    title: "Politiques et conditions",
    description:
      "Administrer les documents légaux, conditions générales et règles de confidentialité.",
    modules: [
      {
        title: "Politique de Vente",
        description:
          "Définir les règles commerciales, modalités de vente et conditions tarifaires.",
        href: "/admin/policies/sales",
        cta: "Gérer",
        icon: Receipt,
        tone: "text-cyan-200",
      },
      {
        title: "Conditions Générales",
        description:
          "Rédiger et mettre à jour les CGV/CGU applicables à la plateforme.",
        href: "/admin/policies/terms",
        cta: "Éditer",
        icon: FileText,
        tone: "text-cyan-500",
      },
      {
        title: "Politique d'Usage",
        description:
          "Encadrer les droits et devoirs des utilisateurs sur la plateforme.",
        href: "/admin/policies/usage",
        cta: "Consulter",
        icon: UserCheck,
        tone: "text-violet-500",
      },
      {
        title: "Confidentialité",
        description:
          "Gérer la politique de protection des données personnelles et RGPD.",
        href: "/admin/policies/privacy",
        cta: "Sécuriser",
        icon: LockKeyhole,
        tone: "text-rose-500",
      },
    ],
  },

];
