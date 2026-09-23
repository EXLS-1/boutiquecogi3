// components/admin/shared/admin-module-nav.tsx
/**
 * Barre de tags horizontale listant les modules du groupe actif.
 *
 * - Server Component : chaque tag est un <Link> vers `module.href`.
 * - Les entrées changent automatiquement quand le groupe actif change
 *   (re-rendu serveur déclenché par le changement de `?group=`).
 */

import Link from "next/link";

import type { AdminModule } from "@/lib/constants/admin-navigation";
import { cn } from "@/lib/utils/cn";

export type AdminModuleNavProps = {
  /** Modules du groupe actif. */
  modules: AdminModule[];
  /** Classes additionnelles pour le conteneur. */
  className?: string;
};

export function AdminModuleNav({ modules, className }: AdminModuleNavProps) {
  if (modules.length === 0) {
    return (
      <p className="text-sm text-cyan-700/70">
        Aucun module disponible pour ce groupe.
      </p>
    );
  }

  return (
    <nav
      aria-label="Modules du groupe actif"
      className={cn(
        "rounded-xl border border-cyan-200 bg-white/70 p-3",
        className,
      )}
    >
      <ul className="flex flex-wrap items-center gap-2">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <li key={`${module.href}::${module.title}`}>
              <Link
                href={module.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5",
                  "text-xs font-medium text-cyan-800 transition-all",
                  "hover:border-emerald-300 hover:bg-white hover:text-emerald-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                )}
              >
                <Icon
                  className={cn("h-3.5 w-3.5", module.tone)}
                  aria-hidden="true"
                />
                <span>{module.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
