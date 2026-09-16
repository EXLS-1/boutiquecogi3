// components/admin/shared/admin-data-table.tsx
// =============================================================================
// TABLEAU ADMIN — Rendu générique, lecture seule, colonnes déclaratives
// =============================================================================
// Les cellules sont rendues CÔTÉ SERVEUR (le tableau ne reçoit que des
// ReactNode) : aucune donnée brute n'est envoyée au client pour être filtrée.
// Le tableau n'est jamais figeux : `overflow-x-auto` est géré par components/ui/table.

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/cn";
import { AdminEmptyState } from "./admin-empty-state";

export interface AdminColumn<T> {
  /** Identifiant stable de colonne. */
  readonly key: string;
  readonly header: React.ReactNode;
  /** Rendu de la cellule, exécuté côté serveur. */
  readonly render: (row: T) => React.ReactNode;
  readonly align?: "left" | "center" | "right";
  readonly className?: string;
}

const ALIGN_CLASSES = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

interface AdminDataTableProps<T> {
  readonly columns: ReadonlyArray<AdminColumn<T>>;
  readonly rows: readonly T[];
  /** Clé de ligne stable (id métier, jamais l'index). */
  readonly rowKey: (row: T) => string;
  readonly caption?: string;
  readonly emptyTitle?: string;
  readonly emptyMessage?: string;
  readonly emptyHint?: string;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  emptyTitle,
  emptyMessage = "Aucun enregistrement à afficher pour le moment.",
  emptyHint,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <AdminEmptyState
        title={emptyTitle}
        message={emptyMessage}
        hint={emptyHint}
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        {caption && <TableCaption>{caption}</TableCaption>}
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                scope="col"
                className={cn(
                  ALIGN_CLASSES[column.align ?? "left"],
                  "text-xs font-semibold uppercase tracking-wide text-slate-500",
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(ALIGN_CLASSES[column.align ?? "left"], column.className)}
                >
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface AdminTableCardProps {
  readonly title: string;
  readonly description?: string;
  readonly actions?: React.ReactNode;
  /** Encart affiché à la place du tableau si la lecture a échoué. */
  readonly degraded?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

/** Carte encadrant un tableau, avec titre et zone d'actions. */
export function AdminTableCard({
  title,
  description,
  actions,
  degraded,
  children,
  className,
}: AdminTableCardProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {degraded ?? children}
    </section>
  );
}

/** Cellule secondaire (texte gris, taille réduite) pour les métadonnées. */
export function AdminCellMuted({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <span className="text-xs text-slate-500">{children}</span>;
}

/** Cellule numérique alignée à droite avec chiffres tabulaires. */
export function AdminCellNumber({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return <span className="tabular-nums">{children}</span>;
}