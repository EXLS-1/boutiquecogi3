// components/admin/shared/admin-module-nav.tsx
// =============================================================================
// NAVIGATION DE MODULE — Onglets de section (rendu serveur, liens réels)
// =============================================================================
// Server Component volontaire : on n'utilise PAS `usePathname()` (état client)
// pour déterminer l'onglet actif, la page appelante fournit `activeHref`.
// Avantage : la navigation est rendue au HTML initial (pas de flash, pas de JS).

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface AdminModuleLink {
  readonly href: string;
  readonly label: string;
}

interface AdminModuleNavProps {
  /** Libellé accessible de la navigation (ex. « Modules marketing »). */
  readonly ariaLabel: string;
  readonly links: readonly AdminModuleLink[];
  /** `href` de l'onglet courant. */
  readonly activeHref?: string;
  readonly className?: string;
}

export function AdminModuleNav({
  ariaLabel,
  links,
  activeHref,
  className,
}: AdminModuleNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "flex flex-wrap gap-2 border-b border-cyan-200 pb-3",
        className,
      )}
    >
      {links.map((link) => {
        const isActive = activeHref === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
              isActive
                ? "bg-cyan-500 text-white shadow-sm"
                : "bg-cyan-100 text-cyan-500 hover:bg-cyan-50 hover:text-cyan-500",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Définitions de navigation par domaine.
 * Centralisées ici pour garantir que chaque page d'un module liste EXACTEMENT
 * les mêmes onglets (une seule source de vérité, pas de dérive entre pages).
 */
export const MARKETING_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/marketing/coupons", label: "Coupons" },
  { href: "/admin/marketing/campaigns", label: "Campagnes" },
  { href: "/admin/marketing/banners", label: "Bannières" },
  { href: "/admin/marketing/emails", label: "E-mails" },
];

export const NOTIFICATIONS_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/notifications/templates", label: "Modèles" },
  { href: "/admin/notifications/history", label: "Historique" },
  { href: "/admin/notifications/settings", label: "Paramètres" },
];

export const RETURNS_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/returns", label: "Demandes" },
  { href: "/admin/returns/policy", label: "Politique" },
  { href: "/admin/returns/refunds", label: "Remboursements" },
];

export const STOCK_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/stock", label: "Niveaux" },
  { href: "/admin/stock/alerts", label: "Alertes" },
  { href: "/admin/stock/movements", label: "Mouvements" },
];

export const HEALTH_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/health/system", label: "Système" },
  { href: "/admin/health/database", label: "Base de données" },
  { href: "/admin/health/storage", label: "Stockage" },
  { href: "/admin/health/logs", label: "Journaux" },
];

export const POLICIES_NAV: readonly AdminModuleLink[] = [
  { href: "/admin/policies/terms", label: "CGU" },
  { href: "/admin/policies/privacy", label: "Confidentialité" },
  { href: "/admin/policies/sales", label: "Ventes" },
  { href: "/admin/policies/usage", label: "Usage" },
];

export const ANALYTICS_NAV: readonly AdminModuleLink[] = [
  { href: "/dashboard/analytics", label: "Vue d'ensemble" },
  { href: "/dashboard/analytics/sales", label: "Ventes" },
  { href: "/dashboard/analytics/aov", label: "Panier moyen" },
  { href: "/dashboard/analytics/conversion", label: "Conversion" },
  { href: "/dashboard/analytics/trends", label: "Tendances" },
];

export const DASHBOARD_NAV: readonly AdminModuleLink[] = [
  { href: "/dashboard", label: "Vue d'ensemble" },
  { href: "/dashboard/alerts", label: "Alertes" },
  { href: "/dashboard/carts", label: "Paniers" },
  { href: "/dashboard/revenue", label: "Chiffre d'affaires" },
  { href: "/dashboard/treasury", label: "Trésorerie" },
  { href: "/dashboard/audit", label: "Audit" },
];

/**
 * Navigation transversale du portail d'administration (`/admin`) : accès
 * direct aux modules d'administration depuis la table de bord.
 * Rendue sur `/admin` avec `activeHref="/admin"` (onglet « Portail » actif).
 * Toutes les cibles ci-dessous sont des routes existantes de `app/admin`.
 */
export const ADMIN_NAV: readonly AdminModuleLink[] = [
  { href: "/admin", label: "Portail" },
  { href: "/admin/products", label: "Produits" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/order", label: "Commandes" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/roles", label: "Rôles" },
  { href: "/admin/auditlog", label: "Journaux d'audit" },
  { href: "/admin/security", label: "Sécurité (2FA)" },
  { href: "/admin/settings/pin", label: "Code PIN" },
];
