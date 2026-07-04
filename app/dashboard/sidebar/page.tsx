// components/dashboard/dashboard-sidebar.tsx
// Sidebar avec navigation conditionnée par niveau RBAC (1-6)
// HIÉRARCHIE DESCENDANTE : Level 1 = SUPER_ADMIN → Level 6 = CLIENT

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Role, Permission, getRoleLevel } from "@/lib/auth/rbac";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Image,
  Video,
  Heart,
  CreditCard,
  Landmark,
  ShieldCheck,
  FileText,
  Users,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Crown,
  Shield,
  UserCog,
  UserCheck,
  Store,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// =============================================================================
// TYPES
// =============================================================================

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minLevel: RoleLevel;      // Niveau MINIMUM requis (1 = Super Admin)
  maxLevel?: RoleLevel;     // Niveau MAXIMUM autorisé (optionnel)
  permissions?: Permission[];
  requireAll?: boolean;
  badge?: string;
  children?: SidebarItem[];
}

interface DashboardSidebarProps {
  userRole: Role;
  userLevel: RoleLevel;
  permissions: Permission[];
}

// =============================================================================
// CONFIGURATION DE NAVIGATION RBAC - HIÉRARCHIE DESCENDANTE
// =============================================================================
// Level 1 = SUPER_ADMIN  (accès total)
// Level 2 = ADMIN        (gestion système)
// Level 3 = MANAGER      (analytics, trésorerie)
// Level 4 = MODERATOR    (modération contenu)
// Level 5 = SELLER       (produits, médias)
// Level 6 = CUSTOMER     (commandes, wishlist)

const NAVIGATION_ITEMS: SidebarItem[] = [
  // ================================================================
  // LEVEL 1 : SUPER ADMIN (accès total)
  // ================================================================
  {
    label: "Configuration système",
    href: "/dashboard/settings/system",
    icon: Crown,
    minLevel: 1,
    permissions: ["settings:system_config"],
    badge: "Super",
  },
  {
    label: "Audit & Logs",
    href: "/dashboard/audit",
    icon: FileText,
    minLevel: 1,
    permissions: ["analytics:read"],
  },
  {
    label: "Gestion RBAC",
    href: "/dashboard/users/roles",
    icon: Shield,
    minLevel: 1,
    permissions: ["settings:manage_roles", "settings:manage_permissions"],
    badge: "Admin",
  },

  // ================================================================
  // LEVEL 2 : ADMIN (gestion utilisateurs, promotions)
  // ================================================================
  {
    label: "Utilisateurs",
    href: "/dashboard/users",
    icon: Users,
    minLevel: 2,
    permissions: ["users:read"],
    children: [
      {
        label: "Liste utilisateurs",
        href: "/dashboard/users",
        icon: Users,
        minLevel: 2,
        permissions: ["users:read"],
      },
      {
        label: "Bannissements",
        href: "/dashboard/users/bans",
        icon: ShieldCheck,
        minLevel: 2,
        permissions: ["users:ban"],
      },
    ],
  },
  {
    label: "Promotions",
    href: "/dashboard/promotions",
    icon: BadgeCheck,
    minLevel: 2,
    permissions: ["promotions:read"],
    children: [
      {
        label: "Campagnes",
        href: "/dashboard/promotions",
        icon: BadgeCheck,
        minLevel: 2,
        permissions: ["promotions:read"],
      },
      {
        label: "Coupons",
        href: "/dashboard/promotions/coupons",
        icon: BadgeCheck,
        minLevel: 2,
        permissions: ["promotions:manage_coupons"],
      },
    ],
  },

  // ================================================================
  // LEVEL 3 : MANAGER (analytics, trésorerie, paiements)
  // ================================================================
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    minLevel: 3,
    permissions: ["analytics:read"],
    children: [
      {
        label: "Vue globale",
        href: "/dashboard/analytics",
        icon: BarChart3,
        minLevel: 3,
        permissions: ["analytics:read"],
      },
      {
        label: "Export données",
        href: "/dashboard/analytics/export",
        icon: BarChart3,
        minLevel: 3,
        permissions: ["analytics:export"],
      },
    ],
  },
  {
    label: "Trésorerie",
    href: "/dashboard/treasury",
    icon: Landmark,
    minLevel: 3,
    permissions: ["payments:read"],
    children: [
      {
        label: "Transactions",
        href: "/dashboard/treasury/transactions",
        icon: Landmark,
        minLevel: 3,
        permissions: ["payments:read"],
      },
      {
        label: "Remboursements",
        href: "/dashboard/treasury/refunds",
        icon: Landmark,
        minLevel: 3,
        permissions: ["payments:refund"],
      },
      {
        label: "Configuration CinetPay",
        href: "/dashboard/treasury/cinetpay",
        icon: Landmark,
        minLevel: 3,
        permissions: ["payments:configure"],
      },
    ],
  },
  {
    label: "Paiements",
    href: "/dashboard/payments",
    icon: CreditCard,
    minLevel: 3,
    permissions: ["payments:read", "payments:configure"],
    requireAll: false,
  },
  {
    label: "Checkout",
    href: "/dashboard/checkout",
    icon: CreditCard,
    minLevel: 3,
    permissions: ["payments:configure"],
  },

  // ================================================================
  // LEVEL 4 : MODERATOR (commandes, catégories, vidéos)
  // ================================================================
  {
    label: "Commandes (toutes)",
    href: "/dashboard/orders/all",
    icon: ShoppingCart,
    minLevel: 4,
    permissions: ["orders:read"],
    badge: "Modération",
  },
  {
    label: "Catégories",
    href: "/dashboard/categories",
    icon: FolderTree,
    minLevel: 4,
    permissions: ["categories:read"],
    children: [
      {
        label: "Arborescence",
        href: "/dashboard/categories",
        icon: FolderTree,
        minLevel: 4,
        permissions: ["categories:read"],
      },
      {
        label: "Réorganiser",
        href: "/dashboard/categories/reorder",
        icon: FolderTree,
        minLevel: 4,
        permissions: ["categories:reorder"],
      },
    ],
  },
  {
    label: "Vidéos",
    href: "/dashboard/videos",
    icon: Video,
    minLevel: 4,
    permissions: ["media:read"],
  },

  // ================================================================
  // LEVEL 5 : SELLER (produits, médias)
  // ================================================================
  {
    label: "Mes produits",
    href: "/dashboard/products",
    icon: Package,
    minLevel: 5,
    permissions: ["products:read"],
    children: [
      {
        label: "Liste des produits",
        href: "/dashboard/products",
        icon: Package,
        minLevel: 5,
        permissions: ["products:read"],
      },
      {
        label: "Ajouter un produit",
        href: "/dashboard/products/new",
        icon: Package,
        minLevel: 5,
        permissions: ["products:create"],
      },
      {
        label: "Gérer les variantes",
        href: "/dashboard/products/variants",
        icon: Package,
        minLevel: 5,
        permissions: ["products:manage_variants"],
      },
      {
        label: "Avis clients",
        href: "/dashboard/products/reviews",
        icon: Package,
        minLevel: 5,
        permissions: ["products:manage_reviews"],
      },
    ],
  },
  {
    label: "Médias",
    href: "/dashboard/media",
    icon: Image,
    minLevel: 5,
    permissions: ["media:read"],
    children: [
      {
        label: "Bibliothèque",
        href: "/dashboard/media",
        icon: Image,
        minLevel: 5,
        permissions: ["media:read"],
      },
      {
        label: "Uploader",
        href: "/dashboard/media/upload",
        icon: Image,
        minLevel: 5,
        permissions: ["media:upload"],
      },
    ],
  },

  // ================================================================
  // LEVEL 6 : CUSTOMER (commandes perso, wishlist)
  // ================================================================
  {
    label: "Mes commandes",
    href: "/dashboard/orders",
    icon: ShoppingCart,
    minLevel: 6,
    permissions: ["orders:read"],
  },
  {
    label: "Ma wishlist",
    href: "/dashboard/wishlist",
    icon: Heart,
    minLevel: 6,
    permissions: ["products:read"],
  },
];

// =============================================================================
// FILTRAGE RBAC - HIÉRARCHIE DESCENDANTE
// =============================================================================
// userLevel doit être <= minLevel (plus petit = plus haut)

function filterNavigation(
  items: SidebarItem[],
  userLevel: RoleLevel,
  userPermissions: Permission[]
): SidebarItem[] {
  const permSet = new Set(userPermissions);

  return items
    .filter((item) => {
      // Vérifier niveau : userLevel doit être <= minLevel (1 = plus haut)
      if (userLevel > item.minLevel) return false;

      // Vérifier maxLevel si défini
      if (item.maxLevel && userLevel < item.maxLevel) return false;

      // Vérifier permissions si définies
      if (item.permissions && item.permissions.length > 0) {
        const requireAll = item.requireAll ?? true;

        if (requireAll) {
          return item.permissions.every((p) => permSet.has(p));
        } else {
          return item.permissions.some((p) => permSet.has(p));
        }
      }

      return true;
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterNavigation(item.children, userLevel, userPermissions)
        : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}

// =============================================================================
// COMPOSANTS
// =============================================================================

function SidebarLink({
  item,
  isActive,
  depth = 0,
}: {
  item: SidebarItem;
  isActive: boolean;
  depth?: number;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
        depth > 0 && "pl-9"
      )}
    >
      {depth === 0 && <Icon className="h-4 w-4" />}
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarGroup({
  item,
  userLevel,
  userPermissions,
}: {
  item: SidebarItem;
  userLevel: RoleLevel;
  userPermissions: Permission[];
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(pathname.startsWith(item.href));
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  const filteredChildren = item.children
    ? filterNavigation(item.children, userLevel, userPermissions)
    : [];

  if (filteredChildren.length === 0 && item.children) {
    return <SidebarLink item={item} isActive={isActive} />;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isActive && "bg-accent text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {item.badge}
            </span>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {filteredChildren.map((child) => (
          <SidebarLink
            key={child.href}
            item={child}
            isActive={pathname === child.href}
            depth={1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// =============================================================================
// MAPPING NIVEAU → LABEL ET ICÔNE
// =============================================================================

const LEVEL_CONFIG: Record<RoleLevel, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  1: { label: "Super Admin", icon: Crown, color: "#dc2626" },
  2: { label: "Admin", icon: Shield, color: "#ea580c" },
  3: { label: "Manager", icon: UserCog, color: "#ca8a04" },
  4: { label: "Modérateur", icon: UserCheck, color: "#16a34a" },
  5: { label: "Vendeur", icon: Store, color: "#2563eb" },
  6: { label: "Client", icon: User, color: "#6b7280" },
};

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================

export function DashboardSidebar({
  userRole,
  userLevel,
  permissions,
}: DashboardSidebarProps) {
  const filteredNav = filterNavigation(NAVIGATION_ITEMS, userLevel, permissions);
  const levelConfig = LEVEL_CONFIG[userLevel];
  const LevelIcon = levelConfig.icon;

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      {/* Header sidebar */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div
            className="h-6 w-6 rounded-md"
            style={{ backgroundColor: userRole.color }}
          />
          <span>Boutiquecogi3</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          {/* Vue d'ensemble accessible à tous */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Vue d&apos;ensemble</span>
          </Link>

          <Separator className="my-2" />

          {filteredNav.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.href}
                item={item}
                userLevel={userLevel}
                userPermissions={permissions}
              />
            ) : (
              <SidebarLink
                key={item.href}
                item={item}
                isActive={false}
              />
            )
          )}
        </nav>

        <Separator className="my-4" />

        {/* Info rôle */}
        <div className="px-4 py-2">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <LevelIcon className="h-4 w-4" style={{ color: levelConfig.color }} />
              <p className="text-xs font-medium text-muted-foreground">Rôle actuel</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: levelConfig.color }}>
              {userRole.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {levelConfig.label} · Level {userLevel}
            </p>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full"
                  style={{
                    backgroundColor: i + 1 >= userLevel ? levelConfig.color : "#e5e7eb",
                    opacity: i + 1 >= userLevel ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
