// components/admin/shared/admin-section-nav.tsx
// =============================================================================
// NAVIGATION DE SECTION — Onglets internes d'un module
// =============================================================================
// Server Component volontaire : on n'utilise PAS `usePathname()` (état client)
// pour déterminer l'onglet actif, la page appelante fournit `activeHref`.

import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface AdminSectionLink {
  readonly href: string;
  readonly label: string;
}

interface AdminSectionNavProps {
  readonly ariaLabel: string;
  readonly links: readonly AdminSectionLink[];
  readonly activeHref?: string;
  readonly className?: string;
}

export function AdminSectionNav({
  ariaLabel,
  links,
  activeHref,
  className,
}: AdminSectionNavProps) {
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
              "rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500",
              isActive
                ? "bg-cyan-500 text-white shadow-sm"
                : "bg-cyan-100 text-cyan-600 hover:bg-cyan-50",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Constantes par domaine (inchangées)                                */
/* ------------------------------------------------------------------ */

export const MARKETING_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/marketing/coupons", label: "Coupons" },
  { href: "/admin/marketing/campaigns", label: "Campagnes" },
  { href: "/admin/marketing/banners", label: "Bannières" },
  { href: "/admin/marketing/emails", label: "E-mails" },
];

export const NOTIFICATIONS_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/notifications/templates", label: "Modèles" },
  { href: "/admin/notifications/history", label: "Historique" },
  { href: "/admin/notifications/settings", label: "Paramètres" },
];

export const RETURNS_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/returns", label: "Demandes" },
  { href: "/admin/returns/policy", label: "Politique" },
  { href: "/admin/returns/refunds", label: "Remboursements" },
];

export const STOCK_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/stock", label: "Niveaux" },
  { href: "/admin/stock/alerts", label: "Alertes" },
  { href: "/admin/stock/movements", label: "Mouvements" },
];

export const HEALTH_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/health/system", label: "Système" },
  { href: "/admin/health/database", label: "Base de données" },
  { href: "/admin/health/storage", label: "Stockage" },
  { href: "/admin/health/logs", label: "Journaux" },
];

export const POLICIES_NAV: readonly AdminSectionLink[] = [
  { href: "/admin/policies/terms", label: "CGU" },
  { href: "/admin/policies/privacy", label: "Confidentialité" },
  { href: "/admin/policies/sales", label: "Ventes" },
  { href: "/admin/policies/usage", label: "Usage" },
];

export const ANALYTICS_NAV: readonly AdminSectionLink[] = [
  { href: "/dashboard/analytics", label: "Vue d'ensemble" },
  { href: "/dashboard/analytics/sales", label: "Ventes" },
  { href: "/dashboard/analytics/aov", label: "Panier moyen" },
  { href: "/dashboard/analytics/conversion", label: "Conversion" },
  { href: "/dashboard/analytics/trends", label: "Tendances" },
];

export const DASHBOARD_NAV: readonly AdminSectionLink[] = [
  { href: "/dashboard", label: "Vue d'ensemble" },
  { href: "/dashboard/alerts", label: "Alertes" },
  { href: "/dashboard/carts", label: "Paniers" },
  { href: "/dashboard/revenue", label: "Chiffre d'affaires" },
  { href: "/dashboard/treasury", label: "Trésorerie" },
  { href: "/dashboard/audit", label: "Audit" },
];
