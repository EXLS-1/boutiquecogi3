// components/admin/shared/admin-module-sidebar.tsx
/**
 * Sidebar de navigation entre les groupes de modules admin.
 *
 * - Server Component : aucun hook, aucun état local.
 * - Chaque entrée est un <Link> vers `/admin?group=<id>`.
 * - L'état actif est dérivé de la prop `activeGroupId` (fournie par la page).
 * - L'en-tête identité (Zone privilégiée / Portail Admin / session) est
 *   rendu en haut à partir de la prop `session`.
 */

import Link from "next/link";
import { Shield } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminModuleGroup } from "@/lib/constants/admin-navigation";
import { cn } from "@/lib/utils/utils";

/** Identité minimale de la session RBAC affichée dans l'en-tête. */
export type AdminModuleSidebarSession = {
  /** Identifiant de l'utilisateur connecté. */
  userId: string;
  /** Informations de rôle (seul le nom est affiché). */
  role: { name: string };
  /** Niveau RBAC (1–7). */
  level: number;
};

export type AdminModuleSidebarProps = {
  /** Groupes à afficher. */
  groups: AdminModuleGroup[];
  /** ID du groupe actif (dérivé de l'URL). */
  activeGroupId: string;
  /** Base path pour construire les liens. */
  basePath?: string;
  /** Session RBAC enrichie (getServerRBACSession). */
  session: AdminModuleSidebarSession;
};

export function AdminModuleSidebar({
  groups,
  activeGroupId,
  basePath = "/admin",
  session,
}: AdminModuleSidebarProps) {
  return (
    <nav
      aria-label="Groupes de modules admin"
      className="w-full shrink-0 space-y-4"
    >
      {/* En-tête identité */}
      <div className="border-b border-cyan-400 pb-4">
        <div className="mb-1 flex items-center gap-2 text-emerald-500">
          <Shield className="h-5 w-5" aria-hidden="true" />
          <span className="font-mono text-xs font-semibold uppercase tracking-widest">
            Zone privilégiée
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Portail Admin</h1>
        <p className="mt-1 space-y-0.5 text-sm text-cyan-500">
          <span className="block">Connecté en tant que :</span>{" "}
          <span className="block font-medium text-rose-500">
            {session.userId}
          </span>{" "}
          <span className="block">{session.role.name}</span>{" "}
          <span className="block">niveau {session.level}</span>
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const isActive = group.id === activeGroupId;

          return (
            <li key={group.id}>
              <Link
                href={`${basePath}?group=${group.id}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2",
                  isActive
                    ? "border-rose-500 bg-white text-rose-500 shadow-sm"
                    : "border-cyan-200 bg-cyan-50 text-cyan-500 hover:border-rose-200 hover:bg-white hover:text-rose-500",
                )}
              >
                {group.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <SignOutButton className="w-full bg-rose-100 border-rose-500 text-red-500 shadow-sm transition-all duration-300 hover:border-rose-500 hover:bg-rose-500 hover:text-white active:scale-95">
        Déconnexion
      </SignOutButton>
    </nav>
  );
}
