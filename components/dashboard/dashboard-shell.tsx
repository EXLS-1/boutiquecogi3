// components/dashboard/dashboard-shell.tsx

"use client";

import { ReactNode } from "react";
import { useSwitchRBAC } from "@/components/providers/switch-provider";
import { AuditModeSwitcher } from "@/components/providers/audit-mode-switcher";
import buildDashboardMenu from "@/components/dashboard/Admin-dashboard-menu";

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
  const { activeRole, activeLevel, isAuditMode } = useSwitchRBAC();

  const nav = buildDashboardMenu();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="border-b border-slate-200 p-4">
          <p className="text-sm text-emeraude-500">Admin Dashboard</p>
          <h1 className="text-lg font-semibold">RBAC Control Center</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-emeraude-500">
              Rôle: <span className="font-medium text-slate-700">{activeRole}</span> · Niveau: {activeLevel}
            </p>
            {isAuditMode && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Audit actif
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-10">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <h2 className="mb-2 px-2 text-xs font-bold uppercase underline tracking-wide text-cyan-500">
                {group.title}
              </h2>
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-md px-6 py-1 text-sm text-cyan-400 transition-colors hover:bg-cyan-100 hover:text-cyan-500"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-cyan-500 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide">
            Contexte de sécurité
          </div>
          <div className="mt-1 text-xs">
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
              <h2 className="text-base font-semibold text-cyan-500">
                Admin Dashboard
              </h2>
              <p className="text-xs text-cyan-400">
                <span className="block">Bienvenue sur le Dashboard administratif.</span>
                <span className="block">Accès conditionné par role, niveau et permissions.</span>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <AuditModeSwitcher />
              <div className="text-right text-xs text-emeraude-700">
                <div className="font-medium">{userEmail}</div>
                <div>{userName}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

