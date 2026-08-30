// components/admin/admin-shortcut-sidebar.tsx
"use client";

/**
 * Sidebar de navigation entre les groupes de raccourcis.
 *
 * - Sémantique <nav> pour l'accessibilité.
 * - Utilise `aria-current="true"` pour l'élément actif.
 * - Bouton de déconnexion intégré (sign-out).
 */

import type { AdminShortcutGroup } from "@/lib/constants/admin-shortcuts";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils/utils";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type AdminShortcutSidebarProps = {
  /** Liste des groupes disponibles */
  groups: AdminShortcutGroup[];
  /** ID du groupe actuellement sélectionné */
  activeGroupId: string;
  /** Callback de changement de groupe */
  onSelect: (groupId: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Composant                                                          */
/* ------------------------------------------------------------------ */

export function AdminShortcutSidebar({
  groups,
  activeGroupId,
  onSelect,
}: AdminShortcutSidebarProps) {
  return (
    <nav
      aria-label="Navigation des modules admin"
      className="w-full shrink-0 space-y-6 lg:w-64"
    >
      <div className="flex flex-col items-stretch gap-2">
        {groups.map((group) => {
          const isActive = group.id === activeGroupId;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                isActive
                  ? "border-emerald-400 bg-white text-emerald-700 shadow-sm"
                  : "border-cyan-200 bg-cyan-50 text-cyan-600 hover:border-rose-200 hover:bg-white hover:text-rose-500",
              )}
            >
              <span className="block">{group.label}</span>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {group.modules.length} module
                {group.modules.length > 1 ? "s" : ""}
              </span>
            </button>
          );
        })}

        <SignOutButton className="mt-3 bg-rose-100 text-red-500 shadow-sm transition-all duration-300 hover:bg-rose-500 hover:text-white active:scale-95">
          Déconnexion
        </SignOutButton>
      </div>
    </nav>
  );
}
