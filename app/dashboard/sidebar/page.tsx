// 
// Server wrapper for dashboard sidebar. Performs RBAC filtering server-side
// and renders the client navigation component for interactive UI.

import SidebarClient, { type SidebarItem } from "./sidebar-client";
import {
  getCurrentUserWithRole,
  getClientPermissions,
  hasAllPermissions,
  hasAnyPermission,
  RoleLevel,
  type Role,
  type Permission,
} from "@/lib/auth/rbac";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Image,
  Video,
  Heart,
  CreditCard,
  BadgeCheck,
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
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type RoleLevelValue = typeof RoleLevel[keyof typeof RoleLevel];

// =============================================================================
// TYPES
// =============================================================================

// Navigation model (kept server-side for RBAC filtering)
const NAVIGATION_ITEMS: SidebarItem[] = [
  // ================================================================
  // LEVEL 1 : SUPER ADMIN (accès total)
  // ================================================================
  {
    label: "Configuration système",
    href: "/dashboard/settings/system",
    icon: Crown,
    minLevel: 1,
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
    // force-cast via unknown to satisfy TS when Permission union doesn't directly match these literals
    permissions: ["audit:switch-self", "audit:switch-others"],

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
// Server-side RBAC navigation filtering
async function filterNavigationServer(
  items: SidebarItem[],
  role: Role,
  userLevel: number,
): Promise<SidebarItem[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      // niveau : userLevel doit être <= minLevel (1 = plus haut)
      if (userLevel > item.minLevel) return null;

      if (item.maxLevel && userLevel < item.maxLevel) return null;

      if (item.permissions && item.permissions.length > 0) {
        const requireAll = item.requireAll ?? true;
        const ok = requireAll
          ? await hasAllPermissions(role, item.permissions as Permission[])
          : await hasAnyPermission(role, item.permissions as Permission[]);
        if (!ok) return null;
      }

      const children = item.children
        ? await filterNavigationServer(item.children, role, userLevel)
        : undefined;

      if (item.children && children && children.length === 0) return null;

      return { ...item, children } as SidebarItem;
    }),
  );

  return results.filter(Boolean) as SidebarItem[];
}

export default async function DashboardSidebar() {
  const userData = await getCurrentUserWithRole();
  const role = (userData?.role ?? ("USER" as Role)) as Role;
  const userLevel = userData?.level ?? RoleLevel.USER;

  const [permissions, filteredNav] = await Promise.all([
    getClientPermissions(role),
    filterNavigationServer(NAVIGATION_ITEMS as SidebarItem[], role, userLevel),
  ]);

  return (
    <SidebarClient
      userRole={{ role }}
      userLevel={userLevel}
      permissions={permissions}
      filteredNav={filteredNav}
      navigationItems={NAVIGATION_ITEMS as SidebarItem[]}
    />
  );
}

