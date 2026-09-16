// components/admin/shared/admin-page-header.tsx
// =============================================================================
// EN-TÊTE DE PAGE ADMIN — Structure homogène (eyebrow / titre / description)
// =============================================================================

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface AdminBreadcrumb {
  readonly href?: string;
  readonly label: string;
}

interface AdminPageHeaderProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly description?: string;
  /** Fil d'Ariane affiché au-dessus du titre. */
  readonly breadcrumbs?: readonly AdminBreadcrumb[];
  /** Zone d'actions alignée à droite (formulaires, filtres, liens). */
  readonly actions?: React.ReactNode;
  /** Encadré d'avertissement (ex. dépendance externe non configurée). */
  readonly notice?: React.ReactNode;
  readonly className?: string;
}

export function AdminPageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  actions,
  notice,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded transition-colors hover:text-cyan-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-700">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          {description && (
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {notice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {notice}
        </div>
      )}
    </header>
  );
}