// components/dashboard/dashboard-shell.tsx

"use client";

import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  userImage,
}: DashboardShellProps) {
  // ── Context ────────────────────────────────────────────────────────────────
  // Correct key names taken directly from SwitchContextType in switch-provider.tsx:
  //   activeRole, activeLevel, isAuditMode, isTransitioning, requiresAuditApproval
  const { activeRole, activeLevel, isAuditMode, requiresAuditApproval } =
    useSwitchRBAC();

  // ── Menu ───────────────────────────────────────────────────────────────────
  // buildDashboardMenu is a FUNCTION — call it to get the array, then map over
  // the result. Using it as a JSX tag (<buildDashboardMenu />) or mapping
  // directly on the function reference are both compile-time/runtime errors.
  const nav = buildDashboardMenu();

  // ── Active-link helper ─────────────────────────────────────────────────────
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // ── Initials fallback for avatar ───────────────────────────────────────────
  const initials = (userName ?? userEmail)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        {/* Sidebar header */}
        <div className="border-b border-cyan-500 p-4">
          <p className="text-sm text-cyan-500">Admin Dashboard</p>
          <h1 className="text-lg font-semibold">RBAC Control Center</h1>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Rôle:{" "}
              <span className="font-medium text-slate-700">{activeRole}</span>
              {" · "}Niveau: {activeLevel}
            </p>
            {isAuditMode && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Audit actif
              </span>
            )}
          </div>
          {requiresAuditApproval && !isAuditMode && (
            <p className="mt-1 text-[10px] text-rose-500">
              Approbation requise pour auditer
            </p>
          )}
        </div>

        {/* Nav groups — nav is the array returned by buildDashboardMenu() */}
        <nav className="flex-1 overflow-y-auto p-4">
          {nav.map((group) => (
            <div key={group.title} className="mb-5">
              <h2 className="mb-2 px-2 text-xs font-bold uppercase tracking-wide text-cyan-500 underline">
                {group.title}
              </h2>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "block rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive(item.href)
                          ? "bg-cyan-50 font-medium text-cyan-600"
                          : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-500",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Security context footer */}
        <div className="border-t border-cyan-200 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Contexte de sécurité
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {isAuditMode
              ? "Simulation applicative en cours. Les permissions affichées sont celles du rôle audité."
              : "Session authentifiée avec droits réels."}
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="lg:pl-72">
        {/* Sticky topbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 lg:px-6">
            {/* Left: branding */}
            <div>
              <h2 className="text-base font-semibold text-cyan-500">
                Admin Dashboard
              </h2>
              <p className="text-xs text-cyan-400">
                <span className="block">Bienvenue sur le Dashboard administratif.</span>
                <span className="block">Accès conditionné par rôle, niveau et permissions.</span>
              </p>
            </div>

            {/* Right: audit switcher + user identity */}
            <div className="flex items-center gap-4">
              <AuditModeSwitcher />

              {/* User identity */}
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cyan-100 text-[11px] font-semibold text-cyan-700">
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={userName ?? userEmail}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                {/* Name + email */}
                <div className="hidden text-right text-xs text-slate-600 sm:block">
                  {userName && (
                    <div className="font-medium text-slate-800">{userName}</div>
                  )}
                  <div className="text-slate-500">{userEmail}</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
