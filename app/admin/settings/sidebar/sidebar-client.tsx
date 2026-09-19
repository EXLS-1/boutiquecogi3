"use client";

import * as React from "react";

export type SidebarItem = {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  minLevel?: number;
  maxLevel?: number;
  badge?: string;
  permissions?: string[];
  requireAll?: boolean;
  children?: SidebarItem[];
};

export function SidebarClient({
  userRole,
  userLevel,
  permissions,
  filteredNav,
  navigationItems,
}: {
  userRole: { role: string };
  userLevel: number;
  permissions: string[];
  filteredNav: SidebarItem[];
  navigationItems: SidebarItem[];
}) {
  return (
    <aside className="w-72 border-r bg-background p-4">
      <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {userRole.role} · level {userLevel}
      </div>
      <nav className="space-y-2">
        {filteredNav.length > 0 ? (
          filteredNav.map((item) => (
            <div key={item.href ?? item.label} className="rounded-md border bg-card p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              {item.children && item.children.length > 0 ? (
                <div className="mt-2 space-y-1 pl-2 text-sm text-muted-foreground">
                  {item.children.map((child) => (
                    <div key={child.href ?? child.label}>{child.label}</div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">Aucune navigation disponible</div>
        )}
      </nav>
      <div className="mt-4 text-xs text-muted-foreground">Permissions: {permissions.length}</div>
      <div className="mt-2 hidden text-xs text-muted-foreground">Full navigation items: {navigationItems.length}</div>
    </aside>
  );
}
