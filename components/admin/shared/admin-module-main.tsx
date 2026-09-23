// components/admin/shared/admin-module-main.tsx
/**
 * Zone de contenu principale : en-tête du groupe actif + répertoire
 * compact de ses modules.
 *
 * Ne redéfinit pas la navigation : les tags du AdminModuleNav et le
 * répertoire pointent tous deux vers `module.href`.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { AdminModuleGroup } from "@/lib/constants/admin-navigation";
import { cn } from "@/lib/utils/utils";

export type AdminModuleMainProps = {
  /** Groupe actif (résolu côté serveur depuis `?group=`). */
  group: AdminModuleGroup;
};

export function AdminModuleMain({ group }: AdminModuleMainProps) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-600">
          {group.eyebrow}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-cyan-900">
          {group.title}
        </h2>
        {group.description ? (
          <p className="max-w-2xl text-sm text-cyan-700">
            {group.description}
          </p>
        ) : null}
      </header>

      <ul className="divide-y divide-cyan-200 overflow-hidden rounded-xl border border-cyan-200 bg-white/70">
        {group.modules.map((module) => {
          const Icon = module.icon;

          return (
            <li key={`${module.href}::${module.title}`}>
              <Link
                href={module.href}
                className={cn(
                  "group flex items-center gap-4 px-4 py-3 transition-colors",
                  "hover:bg-cyan-50",
                  "focus-visible:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500",
                )}
              >
                <Icon
                  className={cn("h-5 w-5 shrink-0", module.tone)}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-cyan-900">
                    {module.title}
                  </p>
                  {module.description ? (
                    <p className="truncate text-xs text-cyan-700/80">
                      {module.description}
                    </p>
                  ) : null}
                </div>

                <span className="hidden text-xs font-medium text-emerald-600 group-hover:underline sm:inline">
                  {module.cta}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-cyan-400 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
