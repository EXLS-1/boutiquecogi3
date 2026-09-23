// components/admin/shared/admin-module-sidebar.tsx
/**
 * Sidebar de navigation entre les groupes de modules admin.
 *
 * - Server Component : aucun hook, aucun état local.
 * - Chaque entrée est un <Link> vers `/admin?group=<id>`.
 * - L'état actif est dérivé de la prop `activeGroupId` (fournie par la page).
 */

import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import type { AdminModuleGroup } from "@/lib/constants/admin-navigation";
import { cn } from "@/lib/utils/utils";

export type AdminModuleSidebarProps = {
  /** Groupes à afficher. */
  groups: AdminModuleGroup[];
  /** ID du groupe actif (dérivé de l'URL). */
  activeGroupId: string;
  /** Base path pour construire les liens. */
  basePath?: string;
};

export function AdminModuleSidebar({
  groups,
  activeGroupId,
  basePath = "/admin",
}: AdminModuleSidebarProps) {
  return (
    <nav
      aria-label="Groupes de modules admin"
      className="w-full shrink-0 space-y-4"
    >
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

      <SignOutButton className="w-full bg-rose-100 text-red-500 shadow-sm transition-all duration-300 hover:bg-rose-500 hover:text-white active:scale-95">
        Déconnexion
      </SignOutButton>
    </nav>
  );
}
