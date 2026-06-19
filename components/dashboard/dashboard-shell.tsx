// components/dashboard/dashboard-shell.tsx
"use client";

import { ReactNode } from "react";
import { useSwitchRBAC } from "@/components/providers/switch-provider";
import { PERMISSIONS, type Permission } from "@/lib/auth/rbac";
import { AuditModeSwitcher } from "./audit-mode-switcher";

interface DashboardShellProps {
  children: ReactNode;
  userEmail: string;
  userName: string | null;
  userImage?: string | null;
}

export function DashboardShell({
  children,
  userEmail,
  userName,
}: DashboardShellProps) {
  const { activeRole, activeLevel, isAuditMode, hasPermission } = useSwitchRBAC();

  const nav = buildDashboardNav(hasPermission);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="text-lg font-semibold">RBAC Control Center</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Rôle: <span className="font-medium text-slate-700">{activeRole}</span> · Niveau: {activeLevel}
            </p>
            {isAuditMode && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Audit actif
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {group.title}
              </h2>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-md px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Contexte de sécurité
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {isAuditMode
              ? "Simulation applicative en cours. Les permissions affichées sont celles du rôle audité."
              : "Session authentifiée avec droits réels."}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            <div>
              <h2 className="text-base font-semibold">Dashboard</h2>
              <p className="text-xs text-slate-500">
                Accès conditionné par rôle, niveau et permissions
              </p>
            </div>
            <div className="flex items-center gap-6">
              <AuditModeSwitcher />
              <div className="text-right text-xs text-slate-500">
                <div className="font-medium text-slate-700">{userEmail ?? "Sans email"}</div>
                <div>{userName ?? "—"}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function buildDashboardNav(can: (permission: Permission) => boolean) {
  return [
    {
      title: "Vue générale",
      items: [{ href: "/dashboard", label: "Overview" }],
    },
    {
      title: "Commerce",
      items: [
        can(PERMISSIONS.CATEGORIES_READ) && { href: "/dashboard/categories", label: "Category" },
        can(PERMISSIONS.ORDERS_READ) && { href: "/dashboard/orders", label: "Order" },
        can(PERMISSIONS.ORDERS_READ) && { href: "/dashboard/checkout", label: "Checkout" },
        can(PERMISSIONS.PRODUCTS_READ) && { href: "/dashboard/wishlist", label: "Wishlist" },
        can(PERMISSIONS.PRODUCTS_READ) && { href: "/dashboard/products", label: "Product" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
    {
      title: "Ops & contenu",
      items: [
        can(PERMISSIONS.SYSTEM_LOGS) && { href: "/dashboard/audit", label: "Audit" },
        can(PERMISSIONS.MEDIA_READ) && { href: "/dashboard/media", label: "Media" },
        can(PERMISSIONS.CONTENT_READ) && { href: "/dashboard/video", label: "Video" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
    {
      title: "Finance",
      items: [can(PERMISSIONS.ANALYTICS_READ) && { href: "/dashboard/tresory", label: "Tresory" }].filter(
        Boolean,
      ) as { href: string; label: string }[],
    },
    {
      title: "Administration",
      items: [
        can(PERMISSIONS.USERS_READ) && { href: "/dashboard/users", label: "Users" },
        can(PERMISSIONS.SETTINGS_ROLES_MANAGE) && { href: "/dashboard/roles", label: "Roles" },
      ].filter(Boolean) as { href: string; label: string }[],
    },
  ];
}
