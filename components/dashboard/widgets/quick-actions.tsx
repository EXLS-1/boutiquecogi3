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
} from "@/lib/auth/rbac";
import {
  WidgetShell,
  WidgetSkeleton,
  WidgetForbidden,
  type WidgetProps,
} from "@/lib/dashboard/widget-server-utils";
import {
  Plus,
  Package,
  ShoppingCart,
  Users,
  Settings,
  FileText,
  BarChart3,
  Image,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ───────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────

interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string | null; // null = tous les rôles authentifiés
  variant: "default" | "secondary" | "outline" | "ghost";
  description: string;
}

// ───────────────────────────────────────────
// CONFIGURATION DES ACTIONS
// ───────────────────────────────────────────

const ALL_ACTIONS: QuickAction[] = [
  {
    label: "Nouveau produit",
    href: "/dashboard/products/new",
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_CREATE,
    variant: "default",
    description: "Ajouter un produit au catalogue",
  },
  {
    label: "Nouvelle commande",
    href: "/dashboard/orders/new",
    icon: ShoppingCart,
    permission: PERMISSIONS.ORDERS_CREATE,
    variant: "secondary",
    description: "Créer une commande manuelle",
  },
  {
    label: "Nouvel utilisateur",
    href: "/dashboard/users/new",
    icon: Users,
    permission: PERMISSIONS.USERS_CREATE,
    variant: "secondary",
    description: "Inviter un membre d'équipe",
  },
  {
    label: "Rapport rapide",
    href: "/dashboard/reports/quick",
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_GENERATE,
    variant: "outline",
    description: "Générer un rapport PDF",
  },
  {
    label: "Contenu",
    href: "/dashboard/content/new",
    icon: FileText,
    permission: PERMISSIONS.CONTENT_CREATE,
    variant: "outline",
    description: "Créer une page ou article",
  },
  {
    label: "Média",
    href: "/dashboard/media/upload",
    icon: Image,
    permission: PERMISSIONS.MEDIA_UPLOAD,
    variant: "outline",
    description: "Uploader des fichiers",
  },
  {
    label: "Paramètres",
    href: "/dashboard/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_UPDATE,
    variant: "ghost",
    description: "Configurer la boutique",
  },
  {
    label: "Audit",
    href: "/dashboard/audit",
    icon: Shield,
    permission: PERMISSIONS.SYSTEM_LOGS,
    variant: "ghost",
    description: "Consulter les logs système",
  },
];

// ───────────────────────────────────────────
// FILTRAGE DES ACTIONS PAR RÔLE
// ───────────────────────────────────────────

async function filterActions(role: Role): Promise<QuickAction[]> {
  const filtered: QuickAction[] = [];

  for (const action of ALL_ACTIONS) {
    if (action.permission === null) {
      filtered.push(action);
      continue;
    }

    const hasPerm = await hasPermission(role, action.permission as typeof PERMISSIONS[keyof typeof PERMISSIONS]);
    if (hasPerm) {
      filtered.push(action);
    }
  }

  return filtered;
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
                className="h-auto py-3 px-3 justify-start gap-2 text-left"
                asChild
              >
                <Link href={action.href}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-xs font-medium">{action.label}</span>
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