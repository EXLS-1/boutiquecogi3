"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import {
  Permission,
  RoleLevel,
  RoleLevelConfig,
  Role,
} from "@/lib/auth/rbac";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  ChevronDown,
  ChevronRight,
  Crown,
  Shield,
} from "lucide-react";

// =============================================================================
// Navigation model (kept client-side for UI; RBAC filtering is done on server)
// =============================================================================

type RoleLevelValue = typeof RoleLevel[keyof typeof RoleLevel];

export type SidebarItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  minLevel: RoleLevelValue;
  maxLevel?: RoleLevelValue;
  permissions?: Permission[];
  requireAll?: boolean;
  badge?: string;
  children?: SidebarItem[];
};

export type SidebarClientProps = {
  userRole: { role: Role };
  userLevel: RoleLevelValue;
  permissions: Permission[];
  filteredNav: SidebarItem[];
  navigationItems: SidebarItem[];
};

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
        depth > 0 && "pl-9",
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
  pathname,
}: {
  item: SidebarItem;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(pathname.startsWith(item.href));
  const Icon = item.icon;
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  const filteredChildren = item.children ?? [];

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
            isActive && "bg-accent text-accent-foreground",
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

export function SidebarClient({
  userRole,
  userLevel,
  permissions: _permissions,
  filteredNav,
}: SidebarClientProps) {
  const pathname = usePathname();

  const levelConfig = RoleLevelConfig[userLevel];
  const LevelIcon = levelConfig.icon as React.ComponentType<
    React.SVGProps<SVGSVGElement>
  >;

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <div
            className="h-6 w-6 rounded-md"
            style={{ backgroundColor: levelConfig.color }}
          />
          <span>Boutiquecogi3</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-1 px-2">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Vue d&apos;ensemble</span>
          </Link>

          <Separator className="my-2" />

          {filteredNav.map((item) =>
            item.children ? (
              <SidebarGroup key={item.href} item={item} pathname={pathname} />
            ) : (
              <SidebarLink key={item.href} item={item} isActive={false} />
            ),
          )}
        </nav>

        <Separator className="my-4" />

        <div className="px-4 py-2">
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 mb-1">
              <LevelIcon
                className="h-4 w-4"
                style={{ color: RoleLevelConfig.color }}
              />
              <p className="text-xs font-medium text-muted-foreground">Rôle actuel</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: RoleLevelConfig.color }}>
              {userRole.role}
            </p>
            <p className="text-xs text-muted-foreground">
              {RoleLevelConfig.label} · Level {userLevel}
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

