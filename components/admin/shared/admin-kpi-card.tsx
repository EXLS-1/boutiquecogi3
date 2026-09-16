// components/admin/shared/admin-kpi-card.tsx
// =============================================================================
// CARTE KPI — Indicateur clé (valeur, libellé, variation, indice)
// =============================================================================
// Server Component : la valeur est formatée côté serveur (formatCents /
// formatMajor), la carte ne reçoit donc que des chaînes prêtes à l'affichage.

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { AdminBadge, type AdminTone } from "./admin-badge";

const ACCENT_CLASSES: Record<AdminTone, string> = {
  neutral: "text-slate-600 bg-slate-100",
  info: "text-blue-600 bg-blue-50",
  success: "text-emerald-600 bg-emerald-50",
  warning: "text-amber-600 bg-amber-50",
  danger: "text-rose-600 bg-rose-50",
  accent: "text-cyan-600 bg-cyan-50",
};

interface AdminKpiCardProps {
  readonly label: string;
  /** Valeur pré-formatée côté serveur (jamais un montant brut en centimes). */
  readonly value: string;
  readonly hint?: string;
  /** Variation signée en % ; `null`/`undefined` = pas de variation affichable. */
  readonly change?: number | null;
  readonly tone?: AdminTone;
  /** Précise que `change` est exprimé sur une période antérieure. */
  readonly changeLabel?: string;
  readonly icon?: React.ComponentType<{ className?: string }>;
  readonly href?: string;
  readonly className?: string;
}

export function AdminKpiCard({
  label,
  value,
  hint,
  change,
  changeLabel,
  tone = "accent",
  icon: Icon,
  href,
  className,
}: AdminKpiCardProps) {
  const hasChange = change !== null && change !== undefined;

  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all",
        href && "hover:border-cyan-300 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              ACCENT_CLASSES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {hasChange && (
          <AdminBadge tone={change >= 0 ? "success" : "danger"}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1).replace(".", ",")} %
          </AdminBadge>
        )}
        {changeLabel && (
          <span className="text-xs text-slate-400">{changeLabel}</span>
        )}
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      >
        {body}
      </Link>
    );
  }

  return body;
}

/** Grille responsive standard pour un jeu de KPI. */
export function AdminKpiGrid({
  children,
  columns = 4,
}: {
  readonly children: React.ReactNode;
  readonly columns?: 2 | 3 | 4;
}) {
  const gridClasses = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  } as const;

  return (
    <div className={cn("grid grid-cols-1 gap-4", gridClasses[columns])}>
      {children}
    </div>
  );
}