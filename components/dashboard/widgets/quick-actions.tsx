// components/dashboard/widgets/quick-actions.tsx
// ============================================
// WIDGET : ACTIONS RAPIDES
// Permissions: Variable selon l'action
// Niveaux: LEVEL 1-6 (tous les rôles authentifiés, actions filtrées)
// GUEST: ❌ Non autorisé
// ============================================

import { Suspense } from "react";
import Link from "next/link";
import {
  PERMISSIONS,
  getCurrentUserWithRole,
  hasPermission,
  type Role,
  type PermissionCode,
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import {
  Package,
  ShoppingCart,
  Users,
  Settings,
  FileText,
  BarChart3,
  Shield,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: readonly PermissionCode[];
  variant: "default" | "secondary" | "outline" | "ghost";
  description: string;
}

// ───────────────────────────────────────────
// CONFIGURATION DES ACTIONS
// ───────────────────────────────────────────

const ALL_ACTIONS: QuickAction[] = [
  { label: "Audit", href: "/admin/dashboard/auditlog", icon: Shield, permissions: [PERMISSIONS["audit:view-logs"]], variant: "ghost", description: "Consulter les journaux d’audit" },
  { label: "Utilisateurs", href: "/admin/users", icon: Users, permissions: [PERMISSIONS["users:create"], PERMISSIONS["users:block"], PERMISSIONS["users:delete"]], variant: "secondary", description: "Gérer les comptes utilisateurs" },
  { label: "Rôles", href: "/admin/roles", icon: Shield, permissions: [PERMISSIONS["role:view"], PERMISSIONS["role:assign"]], variant: "outline", description: "Consulter et attribuer les rôles" },
  { label: "Produits", href: "/admin/products", icon: Package, permissions: [PERMISSIONS["products:create"], PERMISSIONS["products:update"], PERMISSIONS["products:delete"], PERMISSIONS["products:manage_variants"]], variant: "default", description: "Gérer le catalogue produits" },
  { label: "Variantes produit", href: "/admin/products", icon: Package, permissions: [PERMISSIONS["Product-variant:read"], PERMISSIONS["Product-variant:create"], PERMISSIONS["Product-variant:edit:any"], PERMISSIONS["Product-variant:delete:any"]], variant: "outline", description: "Gérer les variantes du catalogue" },
  { label: "Commandes", href: "/admin/dashboard/orders", icon: ShoppingCart, permissions: [PERMISSIONS["orders:read"], PERMISSIONS["orders:cancel"]], variant: "secondary", description: "Consulter et gérer les commandes" },
  { label: "Paiements", href: "/admin/dashboard/treasury", icon: CreditCard, permissions: [PERMISSIONS["payments:view"], PERMISSIONS["payments:cancel"], PERMISSIONS["payments:view_analytics"]], variant: "ghost", description: "Consulter les paiements" },
  { label: "Analytics", href: "/admin/dashboard/analytics", icon: BarChart3, permissions: [PERMISSIONS["analytics:read"]], variant: "outline", description: "Analyser les performances" },
  { label: "Rapports", href: "/admin/dashboard/analytics", icon: FileText, permissions: [PERMISSIONS["reports:generate"]], variant: "outline", description: "Accéder aux rapports" },
  { label: "Paramètres", href: "/admin/settings", icon: Settings, permissions: [PERMISSIONS["settings:update"], PERMISSIONS["settings:system_config"]], variant: "ghost", description: "Configurer la boutique" },
];
// ───────────────────────────────────────────
// FILTRAGE DES ACTIONS PAR RÔLE
// ───────────────────────────────────────────

async function filterActions(role: Role): Promise<QuickAction[]> {
  const visibleActions = await Promise.all(
    ALL_ACTIONS.map(async (action) => {
      const grants = await Promise.all(
        action.permissions.map((permission) => hasPermission(role, permission)),
      );
      return grants.some(Boolean);
    }),
  );

  return ALL_ACTIONS.filter((_, index) => visibleActions[index]);
}

// ───────────────────────────────────────────
// CONTENU ASYNC
// ───────────────────────────────────────────

async function QuickActionsContent({ className }: WidgetProps) {
  const userData = await getCurrentUserWithRole();

  if (!userData?.isAuthenticated) {
    return <WidgetForbidden title="Actions rapides" />;
  }

  const { role } = userData;
  const actions = await filterActions(role);

  return (
    <WidgetShell title="Actions rapides" className={className}>
      <div className="grid grid-cols-2 gap-2">
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 col-span-2">
            Aucune action disponible pour votre rôle.
          </p>
        ) : (
          actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                size="sm"
                className="h-auto py-3 px-3 justify-start gap-2 text-left text-cyan-400 border-cyan-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-500"
                asChild
              >
                <Link href={action.href}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-medium">
                      {action.label}
                      </span>
                    <span className="text-[10px] text-muted-foreground truncate w-full">
                      {action.description}
                    </span>
                  </div>
                </Link>
              </Button>
            );
          })
        )}
      </div>
    </WidgetShell>
  );
}

// ───────────────────────────────────────────
// EXPORT PUBLIC
// ───────────────────────────────────────────

export default function QuickActions({ className }: WidgetProps) {
  return (
    <Suspense fallback={<WidgetSkeleton rows={3} />}>
      <QuickActionsContent className={className} />
    </Suspense>
  );
}
